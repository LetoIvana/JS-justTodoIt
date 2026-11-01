import { HttpClient, HttpContext, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { IGNORE_UNAUTHORIZED } from '../interceptors/unauthorized.interceptor';
import { User } from '../models/user';

export interface LoginData {
	email: string;
	password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
	private readonly http = inject(HttpClient);
	private readonly authUrl = `${environment.apiUrl}/auth`;
	private readonly currentUser = signal<User | null>(null);
	private readonly isServerUnavailable = signal(false);

	public readonly user = this.currentUser.asReadonly();
	public readonly serverUnavailable = this.isServerUnavailable.asReadonly();

	// The session cookie is HTTP-only, so asking the API is the only way to find out whether it is still valid
	public loadUser(): Observable<User | null> {
		return this.http
			.get<User>(`${this.authUrl}/user`, { context: new HttpContext().set(IGNORE_UNAUTHORIZED, true) })
			.pipe(
				catchError((error: unknown) => {
					// Only a 401 means there is no session. Anything else (5xx, network) says nothing about it,
					// so the user must not be shown the login page as if they had been logged out.
					if (!(error instanceof HttpErrorResponse && error.status === HttpStatusCode.Unauthorized)) {
						this.isServerUnavailable.set(true);
					}

					// Not rethrown: a failing app initializer would stop the app from starting at all
					return of(null);
				}),
				tap((user) => this.currentUser.set(user))
			);
	}

	public clearUser(): void {
		this.currentUser.set(null);
	}

	public login(data: LoginData): Observable<User> {
		return this.http
			.post<User>(`${this.authUrl}/login`, data, {
				context: new HttpContext().set(IGNORE_UNAUTHORIZED, true),
			})
			.pipe(tap((user) => this.currentUser.set(user)));
	}

	public register(email: string): Observable<User> {
		return this.http.post<User>(`${this.authUrl}/register`, { email });
	}

	public requestPasswordReset(email: string): Observable<void> {
		return this.http.post<void>(`${this.authUrl}/request-password-reset`, { email });
	}

	public activate(token: string, password: string): Observable<User> {
		return this.http.post<User>(`${this.authUrl}/activate`, { token, password });
	}

	public resetPassword(token: string, password: string): Observable<User> {
		return this.http.post<User>(`${this.authUrl}/reset-password`, { token, password });
	}
}
