import { Routes, UrlMatchResult, UrlSegment } from '@angular/router';
import { CardLayout } from './components/card-layout/card-layout';
import { MainLayout } from './components/main-layout/main-layout';
import { loggedInGuard } from './guards/logged-in.guard';
import { loggedOutGuard } from './guards/logged-out.guard';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Details live at `/<uuid>`, next to `/login` and the other root paths. A plain `:uuid` would match those too,
// and its guard would then send a logged-out user from `/login` back to `/login`, so only a uuid matches here
function todoListUuidMatcher(segments: UrlSegment[]): UrlMatchResult | null {
	return segments.length === 1 && UUID_PATTERN.test(segments[0].path)
		? { consumed: segments, posParams: { uuid: segments[0] } }
		: null;
}

export const routes: Routes = [
	// Protected by default: every page added here needs a session
	{
		path: '',
		canActivate: [loggedInGuard],
		component: MainLayout,
		children: [
			{
				path: '',
				pathMatch: 'full',
				title: 'Todo lists | Just Todo It',
				loadComponent: () => import('./pages/todo-lists/todo-lists-page').then((m) => m.TodoListsPage),
			},
			{
				path: 'create',
				title: 'Create Todo list | Just Todo It',
				loadComponent: () => import('./pages/create-todo-list/create-todo-list-page').then((m) => m.CreateTodoListPage),
			},
			{
				matcher: todoListUuidMatcher,
				title: 'Todo list details | Just Todo It',
				loadComponent: () =>
					import('./pages/todo-list-details/todo-list-details-page').then((m) => m.TodoListDetailsPage),
			},
		],
	},
	// The deliberate exception to the protected group above
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
	{ path: '**', redirectTo: '' },
];
