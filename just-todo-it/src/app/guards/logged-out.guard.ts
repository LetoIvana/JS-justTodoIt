import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// For login, registration, activation and password reset pages, which make no sense with a session.
export const loggedOutGuard: CanActivateFn = () =>
	inject(AuthService).user() ? inject(Router).createUrlTree(['/']) : true;
