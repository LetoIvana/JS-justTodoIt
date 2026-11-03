import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TodoListsPage } from './todo-lists-page';

describe('TodoListsPage', () => {
	it('shows the heading above the Todo lists table', async () => {
		await TestBed.configureTestingModule({
			imports: [TodoListsPage],
			providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
		}).compileComponents();

		const fixture = TestBed.createComponent(TodoListsPage);
		await fixture.whenStable();
		const element: HTMLElement = fixture.nativeElement;

		expect(element.querySelector('h1')?.textContent).toContain('Todo lists');
		expect(element.querySelector('jti-todo-lists-table')).not.toBeNull();
	});
});
