import { HttpInterceptorFn } from '@angular/common/http';

// The session lives in an HTTP-only cookie, so every request has to be sent with credentials
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => next(req.clone({ withCredentials: true }));
