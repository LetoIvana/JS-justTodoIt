import { Component } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { RouterOutlet } from '@angular/router';

/**
 * Wrapper for standalone pages without the app header (e.g. account activation, password reset).
 * The routed page is rendered in a card centred on the screen.
 */
@Component({
	imports: [MatCard, MatCardContent, RouterOutlet],
	selector: 'jti-card-layout',
	styleUrl: './card-layout.scss',
	templateUrl: './card-layout.html',
})
export class CardLayout {}
