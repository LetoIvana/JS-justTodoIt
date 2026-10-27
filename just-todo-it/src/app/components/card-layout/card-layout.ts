import { Component } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';

/**
 * Wrapper for standalone pages without the app header (e.g. account activation, password reset).
 * The page content is projected into a card centred on the screen.
 */
@Component({
	imports: [MatCard, MatCardContent],
	selector: 'jti-card-layout',
	styleUrl: './card-layout.scss',
	templateUrl: './card-layout.html',
})
export class CardLayout {}
