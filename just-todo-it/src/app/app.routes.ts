import { Routes } from '@angular/router';
import { CardLayout } from './components/card-layout/card-layout';
import { MainLayout } from './components/main-layout/main-layout';
import { loggedInGuard } from './guards/logged-in.guard';
import { loggedOutGuard } from './guards/logged-out.guard';

export const routes: Routes = [
	// The deliberate exception to the protected group below
	{
		path: '',
		canActivate: [loggedOutGuard],
		children: [
			{
				path: '',
				component: MainLayout,
				children: [
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
						path: 'forgot-password',
						title: 'Forgot password | Just Todo It',
						loadComponent: () =>
							import('./pages/forgot-password/forgot-password-page').then((m) => m.ForgotPasswordPage),
					},
				],
			},
			{
				path: '',
				component: CardLayout,
				children: [
					{
						path: 'activate-account',
						title: 'Activate account | Just Todo It',
						loadComponent: () =>
							import('./pages/activate-account/activate-account-page').then((m) => m.ActivateAccountPage),
					},
					{
						path: 'reset-password',
						title: 'Reset password | Just Todo It',
						loadComponent: () => import('./pages/reset-password/reset-password-page').then((m) => m.ResetPasswordPage),
					},
				],
			},
		],
	},
	// Protected by default: every page added here needs a session
	{
		path: '',
		canActivate: [loggedInGuard],
		children: [
			// Temporary empty page until the Todo list table (the real home page) exists
			{ path: '', pathMatch: 'full', children: [] },
		],
	},
	{ path: '**', redirectTo: '' },
];
