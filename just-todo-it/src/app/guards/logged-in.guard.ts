import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// For pages that need a session
export const loggedInGuard: CanActivateFn = () =>
	inject(AuthService).user() ? true : inject(Router).createUrlTree(['/login']);
