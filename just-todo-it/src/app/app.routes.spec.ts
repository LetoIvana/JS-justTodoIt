import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { User } from './models/user';
import { AuthService } from './services/auth.service';

describe('routes', () => {
	const user = signal<User | null>(null);
	const todoListUuid = '3f2b8c1e-9d4a-4e6b-8a1f-2c7d5e9b0a13';

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter(routes, withComponentInputBinding()),
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: AuthService, useValue: { user } },
			],
		});
	});

	it('sends a logged-out user from the home page to the login page', async () => {
		user.set(null);

		await RouterTestingHarness.create('/');

		expect(TestBed.inject(Router).url).toBe('/login');
	});

	it('shows a logged-in user the Todo lists table with the header on the home page', async () => {
		user.set({ uuid: '1', email: 'john@example.com' });

		const harness = await RouterTestingHarness.create('/');

		expect(TestBed.inject(Router).url).toBe('/');
		expect(harness.routeNativeElement?.querySelector('jti-header')).not.toBeNull();
		expect(harness.routeNativeElement?.querySelector('jti-todo-lists-table')).not.toBeNull();
	});

	it("opens a Todo list's details page at its uuid for a logged-in user", async () => {
		user.set({ uuid: '1', email: 'john@example.com' });

		const harness = await RouterTestingHarness.create(`/${todoListUuid}`);
		TestBed.inject(HttpTestingController)
			.expectOne(`${environment.apiUrl}/todo-lists/${todoListUuid}?relations=todos`)
			.flush({ uuid: todoListUuid, title: 'Groceries', created: '2026-01-01T00:00:00.000Z' });
		await harness.fixture.whenStable();

		expect(TestBed.inject(Router).url).toBe(`/${todoListUuid}`);
		expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Groceries');
	});

	it('sends a logged-out user from a Todo list details page to the login page', async () => {
		user.set(null);

		await RouterTestingHarness.create(`/${todoListUuid}`);

		expect(TestBed.inject(Router).url).toBe('/login');
	});

	it('keeps a logged-out user on the login page', async () => {
		user.set(null);

		await RouterTestingHarness.create('/login');

		expect(TestBed.inject(Router).url).toBe('/login');
	});

	it('sends a logged-in user from an unknown page to the home page', async () => {
		user.set({ uuid: '1', email: 'john@example.com' });

		await RouterTestingHarness.create('/unknown');

		expect(TestBed.inject(Router).url).toBe('/');
	});

	it('sends a logged-in user from the login page to the home page', async () => {
		user.set({ uuid: '1', email: 'john@example.com' });

		await RouterTestingHarness.create('/login');

		expect(TestBed.inject(Router).url).toBe('/');
	});
});
