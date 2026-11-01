import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header';

/**
 * Wrapper for pages that show the app header. The routed page is rendered below it.
 */
@Component({
	imports: [Header, RouterOutlet],
	selector: 'jti-main-layout',
	styleUrl: './main-layout.scss',
	templateUrl: './main-layout.html',
})
export class MainLayout {}
