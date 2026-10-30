import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatToolbar } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
	imports: [MatIcon, MatToolbar, RouterLink, RouterLinkActive],
	selector: 'jti-header',
	styleUrl: './header.scss',
	templateUrl: './header.html',
})
export class Header {}
