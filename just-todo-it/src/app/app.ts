import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ServerUnavailable } from './components/server-unavailable/server-unavailable';
import { AuthService } from './services/auth.service';

@Component({
	imports: [RouterOutlet, ServerUnavailable],
	selector: 'jti-root',
	templateUrl: './app.html',
})
export class App {
	protected readonly serverUnavailable = inject(AuthService).serverUnavailable;
}
