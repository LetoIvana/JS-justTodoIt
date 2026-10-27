import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { createTestToken, createValidTestToken } from '../../../testing/create-test-token';
import { ResetPasswordPage } from './reset-password-page';

describe('ResetPasswordPage', () => {
	let fixture: ComponentFixture<ResetPasswordPage>;
	let element: HTMLElement;
	let httpTesting: HttpTestingController;

	async function render(token: string): Promise<void> {
		fixture.componentRef.setInput('token', token);
		await fixture.whenStable();
	}

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ResetPasswordPage],
			providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
		}).compileComponents();

		fixture = TestBed.createComponent(ResetPasswordPage);
		element = fixture.nativeElement;
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => httpTesting.verify());

	it('shows an error instead of the form for a malformed token', async () => {
		await render('not-a-token');

		expect(element.querySelector('[role="alert"]')?.textContent).toContain('invalid or has expired');
		expect(element.querySelector('form')).toBeNull();
	});

	it('shows an error instead of the form for an expired token', async () => {
		await render(createTestToken({ email: 'john@example.com', exp: Math.floor(Date.now() / 1000) - 60 }));

		expect(element.querySelector('[role="alert"]')?.textContent).toContain('invalid or has expired');
		expect(element.querySelector('form')).toBeNull();
	});

	it('resets the password with the token and new password, then goes to login', async () => {
		const token = createValidTestToken('john@example.com');
		const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
		await render(token);

		expect(element.querySelector<HTMLInputElement>('input[type="email"]')?.value).toBe('john@example.com');

		element.querySelectorAll<HTMLInputElement>('input[autocomplete="new-password"]').forEach((input) => {
			input.value = 'Password1!';
			input.dispatchEvent(new Event('input'));
		});
		element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();

		const request = httpTesting.expectOne(`${environment.apiUrl}/auth/reset-password`);
		expect(request.request.body).toEqual({ token, password: 'Password1!' });
		request.flush({ uuid: '1', email: 'john@example.com' });

		expect(navigateSpy).toHaveBeenCalledWith(['/login']);
	});
});
