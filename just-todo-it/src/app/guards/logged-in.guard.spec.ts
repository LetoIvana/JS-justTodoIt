import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { User } from '../models/user';
import { AuthService } from '../services/auth.service';
import { loggedInGuard } from './logged-in.guard';

describe('loggedInGuard', () => {
	const user = signal<User | null>(null);

	function runGuard(): ReturnType<typeof loggedInGuard> {
		return TestBed.runInInjectionContext(() => loggedInGuard(null!, null!));
	}

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideRouter([]), { provide: AuthService, useValue: { user } }],
		});
	});

	it('lets a logged-in user through', () => {
		user.set({ uuid: '1', email: 'john@example.com' });

		expect(runGuard()).toBe(true);
	});

	it('sends a logged-out user to the login page', () => {
		user.set(null);

		const result = runGuard() as UrlTree;

		expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login');
	});
});
