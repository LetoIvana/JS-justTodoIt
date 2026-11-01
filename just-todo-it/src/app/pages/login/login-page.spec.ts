import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
	let fixture: ComponentFixture<LoginPage>;
	let element: HTMLElement;
	let httpTesting: HttpTestingController;

	function fillAndSubmit(email: string, password: string): void {
		const emailInput = element.querySelector<HTMLInputElement>('input[type="email"]')!;
		const passwordInput = element.querySelector<HTMLInputElement>('input[autocomplete="current-password"]')!;

		emailInput.value = email;
		emailInput.dispatchEvent(new Event('input'));
		passwordInput.value = password;
		passwordInput.dispatchEvent(new Event('input'));
		element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
		fixture.detectChanges();
	}

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [LoginPage],
			providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
		}).compileComponents();

		fixture = TestBed.createComponent(LoginPage);
		element = fixture.nativeElement;
		httpTesting = TestBed.inject(HttpTestingController);
		await fixture.whenStable();
	});

	afterEach(() => httpTesting.verify());

	it('shows validation errors and makes no API call when the form is empty', () => {
		fillAndSubmit('', '');

		expect(element.textContent).toContain('E-mail is required.');
		expect(element.textContent).toContain('Password is required.');
		httpTesting.expectNone(`${environment.apiUrl}/auth/login`);
	});

	it('logs in with the entered credentials and navigates home', () => {
		const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

		fillAndSubmit('john@example.com', 'secret');

		const request = httpTesting.expectOne(`${environment.apiUrl}/auth/login`);
		expect(request.request.body).toEqual({ email: 'john@example.com', password: 'secret' });
		request.flush({ uuid: '1', email: 'john@example.com' });

		expect(navigateSpy).toHaveBeenCalledWith(['/']);
	});

	it('shows a readable message for wrong credentials', () => {
		fillAndSubmit('john@example.com', 'wrong');

		httpTesting
			.expectOne(`${environment.apiUrl}/auth/login`)
			.flush(
				{ code: 'incorrect_email_or_password', message: 'incorrect_email_or_password' },
				{ status: 401, statusText: 'Unauthorized' }
			);
		fixture.detectChanges();

		expect(element.querySelector('[role="alert"]')?.textContent).toContain('Incorrect e-mail or password.');
	});
});
