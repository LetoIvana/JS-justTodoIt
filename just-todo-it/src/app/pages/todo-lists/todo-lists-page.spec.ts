import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TodoListsPage } from './todo-lists-page';

describe('TodoListsPage', () => {
	it('shows the header above the page', async () => {
		await TestBed.configureTestingModule({
			imports: [TodoListsPage],
			providers: [provideRouter([]), provideHttpClient()],
		}).compileComponents();

		const fixture = TestBed.createComponent(TodoListsPage);
		await fixture.whenStable();
		const element: HTMLElement = fixture.nativeElement;

		expect(element.querySelector('jti-header')).not.toBeNull();
		expect(element.querySelector('h1')?.textContent).toContain('Todo lists');
	});
});
