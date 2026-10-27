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
];
