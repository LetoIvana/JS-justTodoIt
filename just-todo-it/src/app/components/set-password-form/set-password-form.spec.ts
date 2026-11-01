import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SetPasswordForm } from './set-password-form';

describe('SetPasswordForm', () => {
	let fixture: ComponentFixture<SetPasswordForm>;
	let element: HTMLElement;
	let submitAction: ReturnType<typeof vi.fn>;

	function fillAndSubmit(password: string, repeatPassword: string): void {
		const [passwordInput, repeatPasswordInput] = element.querySelectorAll<HTMLInputElement>(
			'input[autocomplete="new-password"]'
		);

		passwordInput.value = password;
		passwordInput.dispatchEvent(new Event('input'));
		repeatPasswordInput.value = repeatPassword;
		repeatPasswordInput.dispatchEvent(new Event('input'));
		element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
		fixture.detectChanges();
	}

	beforeEach(async () => {
		await TestBed.configureTestingModule({ imports: [SetPasswordForm] }).compileComponents();

		submitAction = vi.fn(() => of({}));
		fixture = TestBed.createComponent(SetPasswordForm);
		fixture.componentRef.setInput('email', 'john@example.com');
		fixture.componentRef.setInput('submitLabel', 'Activate account');
		fixture.componentRef.setInput('submitAction', submitAction);
		element = fixture.nativeElement;
		await fixture.whenStable();
	});

	it('shows the e-mail as read-only and the given submit label', () => {
		const emailInput = element.querySelector<HTMLInputElement>('input[type="email"]')!;

		expect(emailInput.value).toBe('john@example.com');
		expect(emailInput.disabled).toBe(true);
		expect(element.querySelector('button[type="submit"]')?.textContent).toContain('Activate account');
	});

	it('shows required errors and does not submit an empty form', () => {
		fillAndSubmit('', '');

		expect(element.textContent).toContain('Password is required.');
		expect(element.textContent).toContain('Please repeat the password.');
		expect(submitAction).not.toHaveBeenCalled();
	});

	it('lists every password requirement before anything is typed', () => {
		const rules = [...element.querySelectorAll('.set-password-form__rule')].map((rule) => rule.textContent);

		expect(rules).toEqual([
			expect.stringContaining('At least 8 characters'),
			expect.stringContaining('One uppercase letter'),
			expect.stringContaining('One lowercase letter'),
			expect.stringContaining('One number'),
			expect.stringContaining('One special character'),
		]);
		expect(element.querySelector('.set-password-form__rule--met')).toBeNull();
	});

	it('ticks off requirements as the password is typed', () => {
		const passwordInput = element.querySelector<HTMLInputElement>('input[autocomplete="new-password"]')!;

		passwordInput.value = 'pass1';
		passwordInput.dispatchEvent(new Event('input'));
		fixture.detectChanges();

		const metRules = [...element.querySelectorAll('.set-password-form__rule--met')].map((rule) => rule.textContent);
		expect(metRules).toEqual([expect.stringContaining('One lowercase letter'), expect.stringContaining('One number')]);
	});

	it.each(['Pass1!', 'password1!', 'PASSWORD1!', 'Password!', 'Password²!', 'Password1', 'Password 1'])(
		'does not submit %s',
		(password) => {
			fillAndSubmit(password, password);

			expect(element.textContent).toContain('Password does not meet all requirements.');
			expect(submitAction).not.toHaveBeenCalled();
		}
	);

	it('does not submit when the passwords do not match', () => {
		fillAndSubmit('Password1!', 'Password2!');

		expect(element.textContent).toContain('Passwords do not match.');
		expect(submitAction).not.toHaveBeenCalled();
	});

	it('submits the password and emits succeeded', () => {
		const succeeded = vi.fn();
		fixture.componentInstance.succeeded.subscribe(succeeded);

		fillAndSubmit('Password1!', 'Password1!');

		expect(submitAction).toHaveBeenCalledWith('Password1!');
		expect(succeeded).toHaveBeenCalled();
	});

	it('shows a readable message when the API call fails', () => {
		submitAction.mockReturnValue(
			throwError(
				() =>
					new HttpErrorResponse({
						status: 403,
						error: { code: 'activation_token_expired_or_invalid' },
					})
			)
		);

		fillAndSubmit('Password1!', 'Password1!');

		expect(element.querySelector('[role="alert"]')?.textContent).toContain(
			'This activation link is invalid or has expired.'
		);
	});
});
