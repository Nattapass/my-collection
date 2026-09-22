import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ReviewMediaService, UploadProgress, UploadContext } from './review-media.service';
import { API_URL } from '../../shared/api-url';
import { authInterceptor } from '../../auth/auth.interceptor';
import { AuthService } from '../../auth/auth.service';

describe('ReviewMediaService', () => {
  let service: ReviewMediaService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), {provide: AuthService, useValue: {token: () => 'session-token'}}] });
    service = TestBed.inject(ReviewMediaService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('uploads directly without exposing the session to R2 and retries completion without another PUT', async () => {
    const blob = new Blob(['image'], {type:'image/webp'});
    const progress: UploadProgress = {};
    const context: UploadContext = {category: 'game', reviewName: 'Example'};
    const failed = service.upload(blob, progress, undefined, context).catch(() => null);
    const sign = http.expectOne(API_URL + '/media/upload-url');
    expect(sign.request.headers.get('Authorization')).toBe('Bearer session-token');
    expect(sign.request.body.category).toBe('game');
    expect(sign.request.body.reviewName).toBe('Example');
    sign.flush({folder:'reviews/game/example--test',url:'https://example.r2.cloudflarestorage.com/pending/photo',receipt:'receipt'});
    await Promise.resolve();
    const put = http.expectOne('https://example.r2.cloudflarestorage.com/pending/photo');
    expect(put.request.headers.has('Authorization')).toBeFalse();
    expect(put.request.method).toBe('PUT');
    put.flush('');
    await Promise.resolve();
    http.expectOne(API_URL + '/media/complete').flush(null,{status:503,statusText:'Unavailable'});
    await failed;
    expect(context.folder).toBe('reviews/game/example--test');
    const retry = service.upload(blob, progress);
    http.expectNone(API_URL + '/media/upload-url');
    http.expectOne(API_URL + '/media/complete').flush({key:'reviews/photo.webp'});
    expect(await retry).toBe('reviews/photo.webp');
    expect(await service.upload(blob, progress)).toBe('reviews/photo.webp');
  });
  it('caches signed URLs only in memory, preserving the requested order and refreshing expired links', () => {
    const a = {key:'reviews/a.webp',caption:'A'}, b = {key:'reviews/b.webp',caption:'B'};
    let now = 100000;
    spyOn(Date,'now').and.callFake(() => now);
    service.read([a,b]).subscribe();
    http.expectOne(API_URL + '/media/read-urls').flush({expiresAt:now + 3600000,photos:[{...a,url:'https://a'},{...b,url:'https://b'}]});
    service.read([b,a]).subscribe(photos => expect(photos.map(p => p.caption)).toEqual(['B','A']));
    http.expectNone(API_URL + '/media/read-urls');
    now += 3600000;
    service.read([a]).subscribe();
    http.expectOne(API_URL + '/media/read-urls').flush({expiresAt:now + 3600000,photos:[{...a,url:'https://new-a'}]});
  });
});
