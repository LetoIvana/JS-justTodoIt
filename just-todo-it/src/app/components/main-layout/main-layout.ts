import { Component } from '@angular/core';
import { Header } from '../header/header';

/**
 * Wrapper for pages that show the app header. The page content is projected below it.
 */
@Component({
	imports: [Header],
	selector: 'jti-main-layout',
	styleUrl: './main-layout.scss',
	templateUrl: './main-layout.html',
})
export class MainLayout {}
