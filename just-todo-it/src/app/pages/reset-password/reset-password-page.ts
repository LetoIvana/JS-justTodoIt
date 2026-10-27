import { Component, computed, inject, input } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { CardLayout } from '../../components/card-layout/card-layout';
import { SetPasswordForm } from '../../components/set-password-form/set-password-form';
import { AuthService } from '../../services/auth.service';
import { getEmailFromToken } from '../../utils/get-email-from-token';

@Component({
	imports: [CardLayout, RouterLink, SetPasswordForm],
	selector: 'jti-reset-password-page',
	styleUrl: './reset-password-page.scss',
	templateUrl: './reset-password-page.html',
})
export class ResetPasswordPage {
	private readonly authService = inject(AuthService);
	private readonly router = inject(Router);
	private readonly snackBar = inject(MatSnackBar);

	// Bound from the `?token=` query param
	public readonly token = input<string>();

	protected readonly email = computed(() => getEmailFromToken(this.token()));
	protected readonly resetPassword = (password: string) => this.authService.resetPassword(this.token() ?? '', password);

	protected onPasswordReset(): void {
		this.snackBar.open('Your password has been reset. You can now log in.', 'Close');
		this.router.navigate(['/login']);
	}
}
