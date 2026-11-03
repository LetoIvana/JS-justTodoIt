import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { unauthorizedInterceptor } from '../../interceptors/unauthorized.interceptor';
import { AuthService } from '../../services/auth.service';
import { TodoListsTableStateService } from '../../services/todo-lists-table-state.service';
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
				// Matches every URL, so the links' active state can follow navigation anywhere
				provideRouter([{ path: '**', children: [] }]),
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

	async function isTodoListsLinkActiveAt(url: string): Promise<boolean> {
		await TestBed.inject(Router).navigateByUrl(url);
		await fixture.whenStable();

		return [...element.querySelectorAll('a')]
			.find((link) => link.textContent?.trim() === 'Todo lists')!
			.classList.contains('header__link--active');
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

	it('shows the create link only when logged in', async () => {
		expect(element.querySelector('a[href="/create"]')).toBeNull();

		await logIn();

		expect(element.querySelector('a[href="/create"]')?.textContent).toContain('Create a new list');
	});

	it('links to the Todo lists table as the user left it, only when logged in', async () => {
		TestBed.inject(TodoListsTableStateService).queryParams.set({ page: 2 });
		await fixture.whenStable();

		expect(element.querySelector('a[href="/?page=2"]')).toBeNull();

		await logIn();

		expect(element.querySelector('a[href="/?page=2"]')?.textContent).toContain('Todo lists');
	});

	it('marks the Todo lists link active only on the table, whatever its query params', async () => {
		await logIn();

		expect(await isTodoListsLinkActiveAt('/?page=2')).toBe(true);
		expect(await isTodoListsLinkActiveAt('/create')).toBe(false);
		expect(await isTodoListsLinkActiveAt('/3f2b8c1e-9d4a-4e6b-8a1f-2c7d5e9b0a13')).toBe(false);
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
