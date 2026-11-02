import { TestBed } from '@angular/core/testing';
import { TodoListDetailsPage } from './todo-list-details-page';

describe('TodoListDetailsPage', () => {
	it('shows the heading', async () => {
		await TestBed.configureTestingModule({
			imports: [TodoListDetailsPage],
		}).compileComponents();

		const fixture = TestBed.createComponent(TodoListDetailsPage);
		await fixture.whenStable();
		const element: HTMLElement = fixture.nativeElement;

		expect(element.querySelector('h1')?.textContent).toContain('Todo list details');
	});
});
