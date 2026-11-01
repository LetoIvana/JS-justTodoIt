import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';

/**
 * Shown instead of the app when the API could not tell whether the user is logged in (5xx, network error).
 * A reload starts the app again, including the user check.
 */
@Component({
	imports: [MatButton, MatCard, MatCardContent],
	selector: 'jti-server-unavailable',
	styleUrl: './server-unavailable.scss',
	templateUrl: './server-unavailable.html',
})
export class ServerUnavailable {
	protected retry(): void {
		location.reload();
	}
}
