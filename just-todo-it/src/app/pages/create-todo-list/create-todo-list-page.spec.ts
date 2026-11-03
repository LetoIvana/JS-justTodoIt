import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { TodoList } from '../../models/todo-list';
import { TodoListsTableStateService } from '../../services/todo-lists-table-state.service';
import { CreateTodoListPage } from './create-todo-list-page';

describe('CreateTodoListPage', () => {
	const todoListsUrl = `${environment.apiUrl}/todo-lists`;
	const created: TodoList = {
		uuid: 'n',
		title: 'Groceries',
		created: '2026-01-01T00:00:00.000Z',
		todos: [
			{ uuid: 'm', title: 'Milk', done: false },
			{ uuid: 'b', title: 'Bread', done: false },
		],
	};
	let fixture: ComponentFixture<CreateTodoListPage>;
	let element: HTMLElement;
	let httpTesting: HttpTestingController;

	async function type(input: HTMLInputElement, value: string): Promise<void> {
		input.value = value;
		input.dispatchEvent(new Event('input'));
		await fixture.whenStable();
	}

	async function fillForm(title: string, items: { title: string; done?: boolean }[]): Promise<void> {
		await type(element.querySelector<HTMLInputElement>('.todo-list-form__title input')!, title);

		for (const item of items) {
			[...element.querySelectorAll<HTMLButtonElement>('button')]
				.find((button) => button.textContent?.trim() === 'Add item')!
				.click();
			await fixture.whenStable();
			const row = [...element.querySelectorAll<HTMLElement>('.todo-list-form__item')].at(-1)!;
			await type(row.querySelector<HTMLInputElement>('.todo-list-form__item-title input')!, item.title);

			if (item.done) {
				row.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
				await fixture.whenStable();
			}
		}
	}

	async function submit(): Promise<void> {
		element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
		await fixture.whenStable();
	}

	// Spied on in beforeEach
	function navigateSpy(): Router['navigate'] {
		return TestBed.inject(Router).navigate;
	}

	// The snack bar is rendered in an overlay outside the page
	function snackBarText(): string | undefined {
		return document.querySelector('mat-snack-bar-container')?.textContent;
	}

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CreateTodoListPage],
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
			],
		}).compileComponents();

		vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	async function render(): Promise<void> {
		fixture = TestBed.createComponent(CreateTodoListPage);
		element = fixture.nativeElement;
		await fixture.whenStable();
	}

	afterEach(() => httpTesting.verify());

	it('creates a list without a follow-up save when nothing is done', async () => {
		await render();
		await fillForm('Groceries', [{ title: 'Milk' }]);

		await submit();

		const request = httpTesting.expectOne({ method: 'POST', url: todoListsUrl });
		expect(request.request.body).toEqual({ title: 'Groceries', todos: [{ title: 'Milk' }] });
		request.flush({ ...created, todos: [created.todos![0]] });
		await fixture.whenStable();

		expect(snackBarText()).toContain('Todo list created');
		expect(navigateSpy()).toHaveBeenCalledWith(['/']);
	});

	it('saves done items with a follow-up update, then reports success', async () => {
		await render();
		await fillForm('Groceries', [{ title: 'Milk', done: true }, { title: 'Bread' }]);

		await submit();
		httpTesting.expectOne({ method: 'POST', url: todoListsUrl }).flush(created);
		await fixture.whenStable();

		expect(navigateSpy()).not.toHaveBeenCalled();
		const update = httpTesting.expectOne({ method: 'PATCH', url: `${todoListsUrl}/n` });
		expect(update.request.body).toEqual({
			title: 'Groceries',
			todos: [
				{ uuid: 'm', title: 'Milk', done: true },
				{ uuid: 'b', title: 'Bread', done: false },
			],
		});
		update.flush({ ...created, todos: [{ ...created.todos![0], done: true }, created.todos![1]] });
		await fixture.whenStable();

		expect(snackBarText()).toContain('Todo list created');
		expect(navigateSpy()).toHaveBeenCalledWith(['/']);
	});

	it('goes to the new list when saving its done items fails', async () => {
		await render();
		await fillForm('Groceries', [{ title: 'Milk', done: true }, { title: 'Bread' }]);

		await submit();
		httpTesting.expectOne({ method: 'POST', url: todoListsUrl }).flush(created);
		await fixture.whenStable();
		httpTesting
			.expectOne({ method: 'PATCH', url: `${todoListsUrl}/n` })
			.flush(null, { status: 500, statusText: 'Server Error' });
		await fixture.whenStable();

		expect(snackBarText()).toContain("The list was created, but its done items couldn't be saved.");
		expect(snackBarText()).not.toContain('Todo list created');
		expect(navigateSpy()).toHaveBeenCalledWith(['/', 'n']);
		expect(element.querySelector('[role="alert"]')).toBeNull();
	});

	it('shows a readable error when the name is already used', async () => {
		await render();
		await fillForm('Groceries', [{ title: 'Milk' }]);

		await submit();
		httpTesting
			.expectOne({ method: 'POST', url: todoListsUrl })
			.flush({ code: 'todo_list_with_same_title_exists' }, { status: 409, statusText: 'Conflict' });
		await fixture.whenStable();

		expect(element.querySelector('[role="alert"]')?.textContent).toContain(
			'You already have a Todo list with this name.'
		);
		expect(navigateSpy()).not.toHaveBeenCalled();
	});

	it('links back to the table as the user left it', async () => {
		TestBed.inject(TodoListsTableStateService).queryParams.set({ page: 2 });

		await render();

		const backLink = [...element.querySelectorAll('a')].find((link) =>
			link.textContent?.includes('Back to todo lists')
		);
		expect(backLink?.getAttribute('href')).toBe('/?page=2');
	});
});
