import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
	imports: [RouterOutlet],
	selector: 'jti-root',
	styleUrl: './app.scss',
	templateUrl: './app.html',
})
export class App {
	protected readonly title = signal('just-todo-it');
}
