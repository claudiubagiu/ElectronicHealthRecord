import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AppError } from '../errors/app.error';

/**
 * Error Interceptor
 * Transforms HttpErrorResponse into AppError
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const appError = new AppError({
        title: error.error?.title,
        type: error.error?.type,
        message: error.error?.detail || error.message || 'An unexpected error occurred',
        status: error.status,
        errors: error.error?.errors,
      });

      return throwError(() => appError);
    }),
  );
};
