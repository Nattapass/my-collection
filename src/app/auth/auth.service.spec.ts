import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { API_URL } from '../shared/api-url';

describe('Backend login', () => {
  beforeEach(() => {
    sessionStorage.removeItem('collection.session');
    TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    sessionStorage.removeItem('collection.session');
  });
  it('authenticates only after backend success and expires the browser session', () => {
    const auth = TestBed.inject(AuthService), http = TestBed.inject(HttpTestingController);
    let now = 100000;
    spyOn(Date,'now').and.callFake(() => now);
    auth.login('owner','test-password').subscribe();
    expect(auth.isAuthenticated()).toBeFalse();
    http.expectOne(API_URL + '/auth/login').flush({token:'signed-token',expiresAt:now + 1000});
    expect(auth.token()).toBe('signed-token');
    now += 1001;
    expect(auth.isAuthenticated()).toBeFalse();
    auth.logout();
    expect(sessionStorage.getItem('collection.session')).toBeNull();
  });
  it('does not authenticate when the backend rejects credentials', () => {
    const auth = TestBed.inject(AuthService), http = TestBed.inject(HttpTestingController);
    auth.login('owner','incorrect').subscribe({error:() => undefined});
    http.expectOne(API_URL + '/auth/login').flush(null,{status:401,statusText:'Unauthorized'});
    expect(auth.isAuthenticated()).toBeFalse();
  });
});
