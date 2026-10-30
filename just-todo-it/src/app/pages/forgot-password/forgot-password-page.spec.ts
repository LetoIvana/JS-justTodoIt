import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ForgotPasswordPage } from './forgot-password-page';

describe('ForgotPasswordPage', () => {
	let fixture: ComponentFixture<ForgotPasswordPage>;
	let element: HTMLElement;
	let httpTesting: HttpTestingController;

	function fillAndSubmit(email: string): void {
		const emailInput = element.querySelector<HTMLInputElement>('input[type="email"]')!;

		emailInput.value = email;
		emailInput.dispatchEvent(new Event('input'));
		element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
		fixture.detectChanges();
	}

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ForgotPasswordPage],
			providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
		}).compileComponents();

		fixture = TestBed.createComponent(ForgotPasswordPage);
		element = fixture.nativeElement;
		httpTesting = TestBed.inject(HttpTestingController);
		await fixture.whenStable();
	});

	afterEach(() => httpTesting.verify());

	it('shows a validation error and makes no API call for an invalid e-mail', () => {
		fillAndSubmit('not-an-email');

		expect(element.textContent).toContain('E-mail is not valid.');
		httpTesting.expectNone(`${environment.apiUrl}/auth/request-password-reset`);
	});

	it('requests a reset link and tells the user to check their inbox', () => {
		fillAndSubmit('john@example.com');

		const request = httpTesting.expectOne(`${environment.apiUrl}/auth/request-password-reset`);
		expect(request.request.body).toEqual({ email: 'john@example.com' });
		request.flush(null, { status: 204, statusText: 'No Content' });
		fixture.detectChanges();

		expect(element.querySelector('[role="status"]')?.textContent).toContain('john@example.com');
		expect(element.querySelector('form')).toBeNull();
	});

	it('shows a readable message when the request fails', () => {
		fillAndSubmit('john@example.com');

		httpTesting
			.expectOne(`${environment.apiUrl}/auth/request-password-reset`)
			.flush({ code: 'password_reset_request_error', message: 'Error' }, { status: 500, statusText: 'Server Error' });
		fixture.detectChanges();

		expect(element.querySelector('[role="alert"]')?.textContent).toContain('Something went wrong. Please try again.');
	});
});
