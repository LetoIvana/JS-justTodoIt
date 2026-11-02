import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './services/auth.service';

describe('App', () => {
	const serverUnavailable = signal(false);

	function render(): HTMLElement {
		const fixture = TestBed.createComponent(App);
		fixture.detectChanges();
		return fixture.nativeElement;
	}

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [App],
			providers: [provideRouter([]), { provide: AuthService, useValue: { serverUnavailable } }],
		}).compileComponents();
	});

	it('renders the routed pages when the server is reachable', () => {
		serverUnavailable.set(false);
		const element = render();

		expect(element.querySelector('router-outlet')).not.toBeNull();
		expect(element.querySelector('jti-server-unavailable')).toBeNull();
	});

	it('renders the server unavailable screen instead of the routed pages when the server is down', () => {
		serverUnavailable.set(true);
		const element = render();

		expect(element.querySelector('jti-server-unavailable')).not.toBeNull();
		expect(element.querySelector('router-outlet')).toBeNull();
	});
});
