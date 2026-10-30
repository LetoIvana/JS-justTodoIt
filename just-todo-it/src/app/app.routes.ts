import { Routes } from '@angular/router';
import { loggedInGuard } from './guards/logged-in.guard';
import { loggedOutGuard } from './guards/logged-out.guard';

export const routes: Routes = [
	// Temporary empty page until the Todo list table (the real home page) exists
	{ path: '', pathMatch: 'full', canActivate: [loggedInGuard], children: [] },
	{
		path: 'login',
		canActivate: [loggedOutGuard],
		title: 'Log in | Just Todo It',
		loadComponent: () => import('./pages/login/login-page').then((m) => m.LoginPage),
	},
	{
		path: 'register',
		canActivate: [loggedOutGuard],
		title: 'Register | Just Todo It',
		loadComponent: () => import('./pages/register/register-page').then((m) => m.RegisterPage),
	},
	{
		path: 'forgot-password',
		canActivate: [loggedOutGuard],
		title: 'Forgot password | Just Todo It',
		loadComponent: () => import('./pages/forgot-password/forgot-password-page').then((m) => m.ForgotPasswordPage),
	},
	{
		path: 'activate-account',
		canActivate: [loggedOutGuard],
		title: 'Activate account | Just Todo It',
		loadComponent: () => import('./pages/activate-account/activate-account-page').then((m) => m.ActivateAccountPage),
	},
	{
		path: 'reset-password',
		canActivate: [loggedOutGuard],
		title: 'Reset password | Just Todo It',
		loadComponent: () => import('./pages/reset-password/reset-password-page').then((m) => m.ResetPasswordPage),
	},
];
