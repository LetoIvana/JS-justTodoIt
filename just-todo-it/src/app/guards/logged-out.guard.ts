import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// For login and registration pages, which make no sense with a session. Activation and password reset links are left
// unguarded so they still work when opened while logged in.
export const loggedOutGuard: CanActivateFn = () =>
	inject(AuthService).user() ? inject(Router).createUrlTree(['/']) : true;
