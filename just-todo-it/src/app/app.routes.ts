import { Routes } from '@angular/router';

export const routes: Routes = [
	// Temporary until the Todo list table (the real home page) exists
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{
		path: 'login',
		title: 'Log in | Just Todo It',
		loadComponent: () => import('./pages/login/login-page').then((m) => m.LoginPage),
	},
	{
		path: 'register',
		title: 'Register | Just Todo It',
		loadComponent: () => import('./pages/register/register-page').then((m) => m.RegisterPage),
	},
	{
		path: 'activate-account',
		title: 'Activate account | Just Todo It',
		loadComponent: () => import('./pages/activate-account/activate-account-page').then((m) => m.ActivateAccountPage),
	},
	{
		path: 'reset-password',
		title: 'Reset password | Just Todo It',
		loadComponent: () => import('./pages/reset-password/reset-password-page').then((m) => m.ResetPasswordPage),
	},
];
