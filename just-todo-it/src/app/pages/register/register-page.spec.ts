import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { RegisterPage } from './register-page';

describe('RegisterPage', () => {
	let fixture: ComponentFixture<RegisterPage>;
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
			imports: [RegisterPage],
			providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
		}).compileComponents();

		fixture = TestBed.createComponent(RegisterPage);
		element = fixture.nativeElement;
		httpTesting = TestBed.inject(HttpTestingController);
		await fixture.whenStable();
	});

	afterEach(() => httpTesting.verify());

	it('shows a validation error and makes no API call for an invalid e-mail', () => {
		fillAndSubmit('not-an-email');

		expect(element.textContent).toContain('E-mail is not valid.');
		httpTesting.expectNone(`${environment.apiUrl}/auth/register`);
	});

	it('registers with the e-mail only and tells the user to check their inbox', () => {
		fillAndSubmit('john@example.com');

		const request = httpTesting.expectOne(`${environment.apiUrl}/auth/register`);
		expect(request.request.body).toEqual({ email: 'john@example.com' });
		request.flush({ uuid: '1', email: 'john@example.com' });
		fixture.detectChanges();

		expect(element.querySelector('[role="status"]')?.textContent).toContain('john@example.com');
		expect(element.querySelector('form')).toBeNull();
	});

	it('shows a readable message when the e-mail is already taken', () => {
		fillAndSubmit('john@example.com');

		httpTesting
			.expectOne(`${environment.apiUrl}/auth/register`)
			.flush(
				{ code: 'user_with_same_email_exists', message: 'Resource already exists' },
				{ status: 409, statusText: 'Conflict' }
			);
		fixture.detectChanges();

		expect(element.querySelector('[role="alert"]')?.textContent).toContain(
			'An account with this e-mail already exists.'
		);
	});
});
