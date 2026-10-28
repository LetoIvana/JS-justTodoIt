import { HttpClient, HttpContext } from '@angular/common/http';
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

	public readonly user = this.currentUser.asReadonly();

	// The session cookie is HTTP-only, so asking the API is the only way to find out whether it is still valid
	public loadUser(): Observable<User | null> {
		return this.http
			.get<User>(`${this.authUrl}/user`, { context: new HttpContext().set(IGNORE_UNAUTHORIZED, true) })
			.pipe(
				catchError(() => of(null)),
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

	// The session cookie is HTTP-only, so only the API can clear it
	public logout(): Observable<void> {
		return this.http.post<void>(`${this.authUrl}/logout`, null).pipe(tap(() => this.clearUser()));
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
