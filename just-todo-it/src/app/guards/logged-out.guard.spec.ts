import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { User } from '../models/user';
import { AuthService } from '../services/auth.service';
import { loggedOutGuard } from './logged-out.guard';

describe('loggedOutGuard', () => {
	const user = signal<User | null>(null);

	function runGuard(): ReturnType<typeof loggedOutGuard> {
		return TestBed.runInInjectionContext(() => loggedOutGuard(null!, null!));
	}

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideRouter([]), { provide: AuthService, useValue: { user } }],
		});
	});

	it('lets a logged-out user through', () => {
		user.set(null);

		expect(runGuard()).toBe(true);
	});

	it('sends a logged-in user to the home page', () => {
		user.set({ uuid: '1', email: 'john@example.com' });

		const result = runGuard() as UrlTree;

		expect(TestBed.inject(Router).serializeUrl(result)).toBe('/');
	});
});
