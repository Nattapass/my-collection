import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { API_URL } from '../shared/api-url';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  // Never send the app session to R2 or an external image host.
  const token = inject(AuthService).token();
  if (token && request.url.startsWith(API_URL + '/') && !request.url.endsWith('/auth/login')) {
    request = request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(request);
};
