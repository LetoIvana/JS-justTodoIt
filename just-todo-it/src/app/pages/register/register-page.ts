import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MainLayout } from '../../components/main-layout/main-layout';
import { AuthService } from '../../services/auth.service';
import { getApiErrorMessage } from '../../utils/get-api-error-message';

@Component({
	imports: [MainLayout, MatButton, MatError, MatFormField, MatInput, MatLabel, ReactiveFormsModule, RouterLink],
	selector: 'jti-register-page',
	styleUrl: './register-page.scss',
	templateUrl: './register-page.html',
})
export class RegisterPage {
	private readonly authService = inject(AuthService);
	private readonly router = inject(Router);
	private readonly snackBar = inject(MatSnackBar);

	protected readonly form = inject(NonNullableFormBuilder).group({
		email: ['', [Validators.required, Validators.email]],
	});
	protected readonly isSubmitting = signal(false);
	protected readonly errorMessage = signal<string | null>(null);

	protected onSubmit(): void {
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}

		const { email } = this.form.getRawValue();

		this.isSubmitting.set(true);
		this.errorMessage.set(null);

		this.authService
			.register(email)
			.pipe(finalize(() => this.isSubmitting.set(false)))
			.subscribe({
				next: () => {
					this.snackBar.open(`We have sent an activation link to ${email}.`, 'Close');
					this.router.navigate(['/login']);
				},
				error: (error: unknown) => this.errorMessage.set(getApiErrorMessage(error)),
			});
	}
}
