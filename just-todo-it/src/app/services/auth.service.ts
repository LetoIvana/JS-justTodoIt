import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user';

export interface LoginData {
	email: string;
	password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
	private readonly http = inject(HttpClient);
	private readonly authUrl = `${environment.apiUrl}/auth`;

	public login(data: LoginData): Observable<User> {
		return this.http.post<User>(`${this.authUrl}/login`, data);
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
