import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { unauthorizedInterceptor } from './unauthorized.interceptor';

describe('unauthorizedInterceptor', () => {
	let httpTesting: HttpTestingController;
	let navigateSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(withInterceptors([unauthorizedInterceptor])),
				provideHttpClientTesting(),
			],
		});

		httpTesting = TestBed.inject(HttpTestingController);
		navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
	});

	afterEach(() => httpTesting.verify());

	it('sends the user to the login page when an authenticated request gets a 401, and still passes the error on', () => {
		let error: HttpErrorResponse | undefined;
		TestBed.inject(HttpClient)
			.get('/todo-lists')
			.subscribe({ error: (e: HttpErrorResponse) => (error = e) });

		httpTesting.expectOne('/todo-lists').flush(null, { status: 401, statusText: 'Unauthorized' });

		expect(navigateSpy).toHaveBeenCalledWith(['/login']);
		expect(error?.status).toBe(401);
	});

	it('forgets the user when the session is lost', () => {
		const authService = TestBed.inject(AuthService);
		authService.login({ email: 'john@example.com', password: 'secret' }).subscribe();
		httpTesting.expectOne(`${environment.apiUrl}/auth/login`).flush({ uuid: '1', email: 'john@example.com' });

		TestBed.inject(HttpClient)
			.get('/todo-lists')
			.subscribe({ error: () => undefined });
		httpTesting.expectOne('/todo-lists').flush(null, { status: 401, statusText: 'Unauthorized' });

		expect(authService.user()).toBeNull();
	});

	it('does not navigate on other errors', () => {
		TestBed.inject(HttpClient)
			.get('/todo-lists')
			.subscribe({ error: () => undefined });

		httpTesting.expectOne('/todo-lists').flush(null, { status: 403, statusText: 'Forbidden' });

		expect(navigateSpy).not.toHaveBeenCalled();
	});

	it('does not navigate when login fails with wrong credentials', () => {
		TestBed.inject(AuthService)
			.login({ email: 'john@example.com', password: 'wrong' })
			.subscribe({ error: () => undefined });

		httpTesting.expectOne(`${environment.apiUrl}/auth/login`).flush(null, { status: 401, statusText: 'Unauthorized' });

		expect(navigateSpy).not.toHaveBeenCalled();
	});
});
