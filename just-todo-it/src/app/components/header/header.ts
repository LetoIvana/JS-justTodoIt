import { Component, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatToolbar } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
	imports: [MatIcon, MatIconButton, MatMenu, MatMenuItem, MatMenuTrigger, MatToolbar, RouterLink, RouterLinkActive],
	selector: 'jti-header',
	styleUrl: './header.scss',
	templateUrl: './header.html',
})
export class Header {
	private readonly authService = inject(AuthService);
	private readonly router = inject(Router);

	protected readonly user = this.authService.user;

	protected onLogout(): void {
		this.authService.logout().subscribe(() => this.router.navigate(['/login']));
	}
}
