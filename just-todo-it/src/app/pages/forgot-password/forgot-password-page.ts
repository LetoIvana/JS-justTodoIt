import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MainLayout } from '../../components/main-layout/main-layout';
import { AuthService } from '../../services/auth.service';
import { getApiErrorMessage } from '../../utils/get-api-error-message';

@Component({
	imports: [MainLayout, MatButton, MatError, MatFormField, MatInput, MatLabel, ReactiveFormsModule, RouterLink],
	selector: 'jti-forgot-password-page',
	styleUrl: './forgot-password-page.scss',
	templateUrl: './forgot-password-page.html',
})
export class ForgotPasswordPage {
	private readonly authService = inject(AuthService);

	protected readonly form = inject(NonNullableFormBuilder).group({
		email: ['', [Validators.required, Validators.email]],
	});
	protected readonly isSubmitting = signal(false);
	protected readonly errorMessage = signal<string | null>(null);
	protected readonly requestedEmail = signal<string | null>(null);

	protected onSubmit(): void {
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}

		const { email } = this.form.getRawValue();

		this.isSubmitting.set(true);
		this.errorMessage.set(null);

		this.authService
			.requestPasswordReset(email)
			.pipe(finalize(() => this.isSubmitting.set(false)))
			.subscribe({
				next: () => this.requestedEmail.set(email),
				error: (error: unknown) => this.errorMessage.set(getApiErrorMessage(error)),
			});
	}
}
