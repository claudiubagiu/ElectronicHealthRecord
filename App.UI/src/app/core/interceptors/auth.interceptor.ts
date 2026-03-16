import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

const EXCLUDED_DOMAINS = ['api.pinata.cloud', 'gateway.pinata.cloud'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isExcluded = EXCLUDED_DOMAINS.some((domain) => req.url.includes(domain));
  if (isExcluded) {
    return next(req);
  }

  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(clonedReq);
  }

  return next(req);
};
