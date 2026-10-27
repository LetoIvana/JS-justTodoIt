import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
	AbstractControl,
	NonNullableFormBuilder,
	ReactiveFormsModule,
	ValidationErrors,
	Validators,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { finalize, Observable } from 'rxjs';
import { getApiErrorMessage } from '../../utils/get-api-error-message';

const minPasswordLength = 8;

// Shown as a checklist under the password field, so every requirement is visible before the user starts typing
const passwordRules = [
	{
		label: `At least ${minPasswordLength} characters`,
		isMet: (password: string) => password.length >= minPasswordLength,
	},
	{ label: 'One uppercase letter', isMet: (password: string) => /\p{Lu}/u.test(password) },
	{ label: 'One lowercase letter', isMet: (password: string) => /\p{Ll}/u.test(password) },
	{ label: 'One number', isMet: (password: string) => /[0-9]/.test(password) },
	// ASCII punctuation and symbols: !"#$%&'()*+,-./:;<=>?@[\]^_`{|}~
	{ label: 'One special character', isMet: (password: string) => /[!-/:-@[-`{-~]/.test(password) },
];

function passwordRulesMet(control: AbstractControl<string>): ValidationErrors | null {
	return passwordRules.every((rule) => rule.isMet(control.value)) ? null : { passwordRules: true };
}

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
	const { password, repeatPassword } = group.getRawValue();

	return password === repeatPassword ? null : { passwordMismatch: true };
}

// The mismatch error lives on the group, so the repeat field has to be told to show it
const repeatPasswordErrorStateMatcher: ErrorStateMatcher = {
	isErrorState: (control, form) => !!control?.touched && (control.invalid || !!form?.hasError('passwordMismatch')),
};

/**
 * Password form shared by account activation and password reset, so both have the same fields and validation.
 * The parent passes the API call as `submitAction`; the form handles validation, the submitting state and API errors.
 */
@Component({
	imports: [
		MatButton,
		MatError,
		MatFormField,
		MatIcon,
		MatIconButton,
		MatInput,
		MatLabel,
		MatSuffix,
		ReactiveFormsModule,
	],
	selector: 'jti-set-password-form',
	styleUrl: './set-password-form.scss',
	templateUrl: './set-password-form.html',
})
export class SetPasswordForm {
	public readonly email = input.required<string>();
	public readonly submitLabel = input.required<string>();
	public readonly submitAction = input.required<(password: string) => Observable<unknown>>();
	public readonly succeeded = output();

	protected readonly form = inject(NonNullableFormBuilder).group(
		{
			password: ['', [Validators.required, passwordRulesMet]],
			repeatPassword: ['', Validators.required],
		},
		{ validators: passwordsMatch }
	);
	private readonly password = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
	protected readonly passwordRules = computed(() =>
		passwordRules.map((rule) => ({ label: rule.label, isMet: rule.isMet(this.password()) }))
	);
	protected readonly repeatPasswordErrorStateMatcher = repeatPasswordErrorStateMatcher;
	protected readonly isPasswordVisible = signal(false);
	protected readonly isRepeatPasswordVisible = signal(false);
	protected readonly isSubmitting = signal(false);
	protected readonly errorMessage = signal<string | null>(null);

	protected onSubmit(): void {
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}

		this.isSubmitting.set(true);
		this.errorMessage.set(null);

		this.submitAction()(this.form.getRawValue().password)
			.pipe(finalize(() => this.isSubmitting.set(false)))
			.subscribe({
				next: () => this.succeeded.emit(),
				error: (error: unknown) => this.errorMessage.set(getApiErrorMessage(error)),
			});
	}
}
