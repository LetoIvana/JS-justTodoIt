import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbar } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { getApiErrorMessage } from '../../utils/get-api-error-message';

@Component({
	imports: [MatIcon, MatIconButton, MatMenu, MatMenuItem, MatMenuTrigger, MatToolbar, RouterLink, RouterLinkActive],
	selector: 'jti-header',
	styleUrl: './header.scss',
	templateUrl: './header.html',
})
export class Header {
	private readonly authService = inject(AuthService);
	private readonly router = inject(Router);
	private readonly snackBar = inject(MatSnackBar);

	protected readonly user = this.authService.user;

	protected onLogout(): void {
		this.authService.logout().subscribe({
			next: () => this.router.navigate(['/login']),
			error: (error: unknown) => {
				// A 401 means the session was already gone, and unauthorizedInterceptor has logged the user out
				if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.Unauthorized) {
					return;
				}

				this.snackBar.open(getApiErrorMessage(error), 'Close');
			},
		});
	}
}
