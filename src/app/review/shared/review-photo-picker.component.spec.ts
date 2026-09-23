import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ReviewPhotoPickerComponent } from './review-photo-picker.component';
import { ReviewMediaService } from './review-media.service';

describe('Review photo editor', () => {
  const media = { read: jasmine.createSpy(), upload: jasmine.createSpy() };
  beforeEach(() => {
    media.read.and.callFake((photos: {key:string}[]) => of(photos.map(photo => ({...photo,url:'https://example.com/' + photo.key}))));
    media.upload.calls.reset();
    TestBed.configureTestingModule({imports:[ReviewPhotoPickerComponent],providers:[{provide:ReviewMediaService,useValue:media}]});
  });
  it('preserves existing keys, saves reorder/removal and never reuploads existing photos', async () => {
    const fixture = TestBed.createComponent(ReviewPhotoPickerComponent);
    fixture.componentRef.setInput('existing',[{key:'first',caption:'One'},{key:'second',caption:'Two'}]);
    fixture.detectChanges();
    const picker = fixture.componentInstance;
    picker.move(1,-1);
    expect((await picker.prepare()).map(p => p.key)).toEqual(['second','first']);
    picker.remove(1);
    expect(await picker.prepare()).toEqual([{key:'second',caption:'Two'}]);
    expect(media.upload).not.toHaveBeenCalled();
    fixture.destroy();
  });
  it('does not lose existing references when preview URLs fail', async () => {
    media.read.and.returnValue(throwError(() => new Error('Network failure')));
    const fixture = TestBed.createComponent(ReviewPhotoPickerComponent);
    fixture.componentRef.setInput('existing',[{key:'first',caption:'One'}]);
    fixture.detectChanges();
    expect(fixture.componentInstance.error()).toBeTruthy();
    expect(await fixture.componentInstance.prepare()).toEqual([{key:'first',caption:'One'}]);
    fixture.destroy();
  });
  it('keeps the textarea focused while typing, preserves line breaks through reorder, and supports clearing a note', async () => {
    const fixture = TestBed.createComponent(ReviewPhotoPickerComponent);
    fixture.componentRef.setInput('existing',[{key:'first',caption:'old.png'},{key:'second',caption:''}]);
    fixture.detectChanges();
    const picker = fixture.componentInstance;
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.focus();
    textarea.value = 'ฉากที่ประทับใจ\n' + 'ทดสอบ'.repeat(60);
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('textarea')).toBe(textarea);
    expect(picker.gallery()[0].caption).toBe(textarea.value);
    picker.move(0,1);
    expect((await picker.prepare())[1]).toEqual({key:'first',caption:textarea.value});
    picker.updateCaption(1,'');
    expect((await picker.prepare())[1].caption).toBe('');
    expect(media.upload).not.toHaveBeenCalled();
    fixture.destroy();
  });
  it('retains newly selected files when upload fails', async () => {
    const fixture = TestBed.createComponent(ReviewPhotoPickerComponent);
    fixture.detectChanges();
    const picker = fixture.componentInstance;
    const blob = new Blob(['test'],{type:'image/webp'});
    picker.photos.set([{url:URL.createObjectURL(blob),name:'Example',caption:'',original:4,size:4,blob,progress:{}}]);
    media.upload.and.rejectWith(new Error('Network failure'));
    await expectAsync(picker.prepare()).toBeRejected();
    expect(picker.photos().length).toBe(1);
    expect(picker.busy()).toBeFalse();
    fixture.destroy();
  });
  it('compresses a large PNG in the browser before it can be uploaded', async () => {
    const fixture = TestBed.createComponent(ReviewPhotoPickerComponent);
    fixture.detectChanges();
    const canvas = document.createElement('canvas');
    canvas.width = 2600; canvas.height = 1300;
    canvas.getContext('2d')!.fillRect(0,0,2600,1300);
    const original = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), 'image/png'));
    await fixture.componentInstance.add([new File([original],'large.png',{type:'image/png'})]);
    const photo = fixture.componentInstance.photos()[0];
    const bitmap = await createImageBitmap(photo.blob!);
    expect(Math.max(bitmap.width,bitmap.height)).toBeLessThanOrEqual(1920);
    expect(photo.size).toBeLessThan(original.size);
    expect(photo.blob!.type).toBe('image/webp');
    expect(photo.caption).toBe('');
    expect(media.upload).not.toHaveBeenCalled();
    bitmap.close();
    fixture.destroy();
  });
});
