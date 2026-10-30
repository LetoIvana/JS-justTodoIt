import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { credentialsInterceptor } from './interceptors/credentials.interceptor';
import { unauthorizedInterceptor } from './interceptors/unauthorized.interceptor';
import { AuthService } from './services/auth.service';

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),
		provideRouter(routes, withComponentInputBinding()),
		provideHttpClient(withFetch(), withInterceptors([credentialsInterceptor, unauthorizedInterceptor])),
		// The guards read the user synchronously, so it has to be known before the first navigation
		provideAppInitializer(() => inject(AuthService).loadUser()),
		// index.html loads the Material Symbols font, not the legacy Material Icons one
		{ provide: MAT_ICON_DEFAULT_OPTIONS, useValue: { fontSet: 'material-symbols-outlined' } },
	],
};
