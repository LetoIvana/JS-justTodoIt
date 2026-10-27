import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MainLayout } from '../../components/main-layout/main-layout';
import { AuthService } from '../../services/auth.service';
import { getApiErrorMessage } from '../../utils/get-api-error-message';

@Component({
	imports: [
		MainLayout,
		MatButton,
		MatError,
		MatFormField,
		MatIcon,
		MatIconButton,
		MatInput,
		MatLabel,
		MatSuffix,
		ReactiveFormsModule,
		RouterLink,
	],
	selector: 'jti-login-page',
	styleUrl: './login-page.scss',
	templateUrl: './login-page.html',
})
export class LoginPage {
	private readonly authService = inject(AuthService);
	private readonly router = inject(Router);

	protected readonly form = inject(NonNullableFormBuilder).group({
		email: ['', [Validators.required, Validators.email]],
		password: ['', Validators.required],
	});
	protected readonly isPasswordVisible = signal(false);
	protected readonly isSubmitting = signal(false);
	protected readonly errorMessage = signal<string | null>(null);

	protected togglePasswordVisibility(): void {
		this.isPasswordVisible.update((isVisible) => !isVisible);
	}

	protected onSubmit(): void {
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}

		this.isSubmitting.set(true);
		this.errorMessage.set(null);

		this.authService
			.login(this.form.getRawValue())
			.pipe(finalize(() => this.isSubmitting.set(false)))
			.subscribe({
				next: () => this.router.navigate(['/']),
				error: (error: unknown) => this.errorMessage.set(getApiErrorMessage(error)),
			});
	}
}
