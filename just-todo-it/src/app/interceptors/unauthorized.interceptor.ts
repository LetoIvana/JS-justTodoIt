import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// For requests where a 401 is an expected answer (wrong credentials, no session yet) rather than a lost session
export const IGNORE_UNAUTHORIZED = new HttpContextToken<boolean>(() => false);

// The session is gone (expired or revoked), so the user is effectively logged out
export const unauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
	const router = inject(Router);
	const authService = inject(AuthService);

	return next(req).pipe(
		catchError((error: unknown) => {
			if (
				error instanceof HttpErrorResponse &&
				error.status === HttpStatusCode.Unauthorized &&
				!req.context.get(IGNORE_UNAUTHORIZED)
			) {
				// Otherwise loggedOutGuard would still see the stale user and bounce away from the login page
				authService.clearUser();
				router.navigate(['/login']);
			}

			return throwError(() => error);
		})
	);
};
