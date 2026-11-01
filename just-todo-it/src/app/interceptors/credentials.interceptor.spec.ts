import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { credentialsInterceptor } from './credentials.interceptor';

describe('credentialsInterceptor', () => {
	it('sends every request with credentials so the session cookie is included', () => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(withInterceptors([credentialsInterceptor])), provideHttpClientTesting()],
		});

		TestBed.inject(HttpClient).get('/todo-lists').subscribe();

		const request = TestBed.inject(HttpTestingController).expectOne('/todo-lists');
		expect(request.request.withCredentials).toBe(true);
	});
});
