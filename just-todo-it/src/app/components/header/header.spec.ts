import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { unauthorizedInterceptor } from '../../interceptors/unauthorized.interceptor';
import { AuthService } from '../../services/auth.service';
import { Header } from './header';

describe('Header', () => {
	const user = { uuid: '1', email: 'john@example.com' };
	let fixture: ComponentFixture<Header>;
	let element: HTMLElement;
	let httpTesting: HttpTestingController;

	async function logIn(): Promise<void> {
		TestBed.inject(AuthService).login({ email: user.email, password: 'secret' }).subscribe();
		httpTesting.expectOne(`${environment.apiUrl}/auth/login`).flush(user);
		await fixture.whenStable();
	}

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [Header],
			providers: [
				provideRouter([]),
				provideHttpClient(withInterceptors([unauthorizedInterceptor])),
				provideHttpClientTesting(),
			],
		}).compileComponents();

		fixture = TestBed.createComponent(Header);
		element = fixture.nativeElement;
		httpTesting = TestBed.inject(HttpTestingController);
		await fixture.whenStable();
	});

	afterEach(() => httpTesting.verify());

	async function clickLogOut(): Promise<void> {
		element.querySelector<HTMLButtonElement>('[aria-label="Open user menu"]')!.click();
		await fixture.whenStable();
		const logoutButton = [...document.querySelectorAll<HTMLButtonElement>('[mat-menu-item]')].find(
			(button) => button.textContent?.trim() === 'Log out'
		)!;
		logoutButton.click();
	}

	it('shows the Log in and Register links when logged out', () => {
		expect(element.textContent).toContain('Log in');
		expect(element.textContent).toContain('Register');
		expect(element.querySelector('[aria-label="Open user menu"]')).toBeNull();
	});

	it('shows the user email and menu button instead of the links when logged in', async () => {
		await logIn();

		expect(element.textContent).toContain(user.email);
		expect(element.textContent).not.toContain('Log in');
		expect(element.textContent).not.toContain('Register');
		expect(element.querySelector('[aria-label="Open user menu"]')).not.toBeNull();
	});

	it('logs out from the menu and navigates to the login page', async () => {
		const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
		await logIn();

		await clickLogOut();

		httpTesting.expectOne(`${environment.apiUrl}/auth/logout`).flush(null, { status: 204, statusText: 'No Content' });
		await fixture.whenStable();

		expect(TestBed.inject(AuthService).user()).toBeNull();
		expect(navigateSpy).toHaveBeenCalledWith(['/login']);
		expect(element.textContent).toContain('Log in');
	});

	it('shows a message and keeps the user logged in when logging out fails', async () => {
		const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
		await logIn();

		await clickLogOut();

		httpTesting
			.expectOne(`${environment.apiUrl}/auth/logout`)
			.flush(null, { status: 500, statusText: 'Internal Server Error' });
		await fixture.whenStable();

		expect(document.querySelector('mat-snack-bar-container')?.textContent).toContain(
			'Something went wrong. Please try again.'
		);
		expect(TestBed.inject(AuthService).user()).toEqual(user);
		expect(navigateSpy).not.toHaveBeenCalled();
	});

	it('shows no message when the session was already gone, since the user ends up logged out anyway', async () => {
		const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
		await logIn();

		await clickLogOut();

		httpTesting.expectOne(`${environment.apiUrl}/auth/logout`).flush(null, { status: 401, statusText: 'Unauthorized' });
		await fixture.whenStable();

		expect(document.querySelector('mat-snack-bar-container')).toBeNull();
		expect(TestBed.inject(AuthService).user()).toBeNull();
		expect(navigateSpy).toHaveBeenCalledWith(['/login']);
	});
});
