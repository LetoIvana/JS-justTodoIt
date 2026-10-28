import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { unauthorizedInterceptor } from '../interceptors/unauthorized.interceptor';
import { AuthService } from './auth.service';

describe('AuthService', () => {
	const user = { uuid: '1', email: 'john@example.com' };
	let service: AuthService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(withInterceptors([unauthorizedInterceptor])),
				provideHttpClientTesting(),
			],
		});

		service = TestBed.inject(AuthService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => httpTesting.verify());

	it('stores the user when the session is still valid', () => {
		service.loadUser().subscribe();

		httpTesting.expectOne(`${environment.apiUrl}/auth/user`).flush(user);

		expect(service.user()).toEqual(user);
	});

	it('treats a 401 as logged out, without sending the user to the login page', () => {
		const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
		let result: unknown;
		service.loadUser().subscribe((loaded) => (result = loaded));

		httpTesting.expectOne(`${environment.apiUrl}/auth/user`).flush(null, { status: 401, statusText: 'Unauthorized' });

		expect(result).toBeNull();
		expect(service.user()).toBeNull();
		expect(navigateSpy).not.toHaveBeenCalled();
	});

	it('stores the user after logging in', () => {
		service.login({ email: user.email, password: 'secret' }).subscribe();

		httpTesting.expectOne(`${environment.apiUrl}/auth/login`).flush(user);

		expect(service.user()).toEqual(user);
	});

	it('clears the user after logging out', () => {
		service.login({ email: user.email, password: 'secret' }).subscribe();
		httpTesting.expectOne(`${environment.apiUrl}/auth/login`).flush(user);

		service.logout().subscribe();

		const request = httpTesting.expectOne(`${environment.apiUrl}/auth/logout`);
		expect(request.request.method).toBe('POST');
		request.flush(null, { status: 204, statusText: 'No Content' });

		expect(service.user()).toBeNull();
	});

	it('treats a 401 on logout as a lost session, logging the user out and sending them to the login page', () => {
		const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
		service.login({ email: user.email, password: 'secret' }).subscribe();
		httpTesting.expectOne(`${environment.apiUrl}/auth/login`).flush(user);

		service.logout().subscribe({ error: () => undefined });
		httpTesting.expectOne(`${environment.apiUrl}/auth/logout`).flush(null, { status: 401, statusText: 'Unauthorized' });

		expect(service.user()).toBeNull();
		expect(navigateSpy).toHaveBeenCalledWith(['/login']);
	});
});
