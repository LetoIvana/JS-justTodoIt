import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { TodoList, TodoListData } from '../../models/todo-list';
import { TodoListForm } from './todo-list-form';

describe('TodoListForm', () => {
	const emptyList: TodoListData = { title: '', todos: [] };
	let fixture: ComponentFixture<TodoListForm>;
	let element: HTMLElement;
	let submitAction: ReturnType<typeof vi.fn<(value: TodoListData) => Observable<TodoList>>>;
	let saved: ReturnType<typeof vi.fn<(todoList: TodoList) => void>>;

	function savedList(overrides: Partial<TodoList> = {}): TodoList {
		return { uuid: 'list', title: 'Groceries', created: '2026-01-01T00:00:00.000Z', todos: [], ...overrides };
	}

	async function render(initialValue: TodoListData): Promise<void> {
		fixture.componentRef.setInput('initialValue', initialValue);
		await fixture.whenStable();
	}

	function titleInput(): HTMLInputElement {
		return element.querySelector<HTMLInputElement>('.todo-list-form__title input')!;
	}

	function rows(): HTMLElement[] {
		return [...element.querySelectorAll<HTMLElement>('.todo-list-form__item')];
	}

	function itemInput(index: number): HTMLInputElement {
		return rows()[index].querySelector<HTMLInputElement>('.todo-list-form__item-title input')!;
	}

	function itemCheckbox(index: number): HTMLInputElement {
		return rows()[index].querySelector<HTMLInputElement>('input[type="checkbox"]')!;
	}

	function submitButton(): HTMLButtonElement {
		return element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
	}

	async function type(input: HTMLInputElement, value: string): Promise<void> {
		input.value = value;
		input.dispatchEvent(new Event('input'));
		await fixture.whenStable();
	}

	async function setTitle(value: string): Promise<void> {
		await type(titleInput(), value);
	}

	async function addItem(title = ''): Promise<void> {
		[...element.querySelectorAll<HTMLButtonElement>('button')]
			.find((button) => button.textContent?.trim() === 'Add item')!
			.click();
		await fixture.whenStable();
		await type(itemInput(rows().length - 1), title);
	}

	async function setItemTitle(index: number, value: string): Promise<void> {
		await type(itemInput(index), value);
	}

	async function toggleItem(index: number): Promise<void> {
		itemCheckbox(index).click();
		await fixture.whenStable();
	}

	async function removeItem(index: number): Promise<void> {
		rows()[index].querySelector<HTMLButtonElement>('button[aria-label^="Remove"]')!.click();
		await fixture.whenStable();
	}

	async function submit(): Promise<void> {
		submitButton().click();
		await fixture.whenStable();
	}

	beforeEach(async () => {
		await TestBed.configureTestingModule({ imports: [TodoListForm] }).compileComponents();

		submitAction = vi.fn((value: TodoListData) => of(savedList({ title: value.title })));
		saved = vi.fn();
		fixture = TestBed.createComponent(TodoListForm);
		fixture.componentRef.setInput('submitLabel', 'Save');
		fixture.componentRef.setInput('submitAction', submitAction);
		fixture.componentInstance.saved.subscribe(saved);
		element = fixture.nativeElement;
	});

	it('shows the initial title and items', async () => {
		await render({ title: 'Groceries', todos: [{ uuid: 'a', title: 'Milk', done: true }] });

		expect(titleInput().value).toBe('Groceries');
		expect(rows()).toHaveLength(1);
		expect(itemInput(0).value).toBe('Milk');
		expect(itemCheckbox(0).checked).toBe(true);
		expect(submitButton().textContent).toContain('Save');
	});

	it('shows a title error and does not submit without a title', async () => {
		await render(emptyList);
		await addItem('Milk');

		await submit();

		expect(element.textContent).toContain('Title is required.');
		expect(submitAction).not.toHaveBeenCalled();
	});

	it('shows an items error and does not submit without items', async () => {
		await render(emptyList);
		await setTitle('Groceries');

		await submit();

		expect(element.querySelector('.todo-list-form__items-error')?.textContent).toContain('Add at least one item.');
		expect(submitAction).not.toHaveBeenCalled();
	});

	it('shows an item error and does not submit with an empty item name', async () => {
		await render(emptyList);
		await setTitle('Groceries');
		await addItem('');

		await submit();

		expect(rows()[0].textContent).toContain('Item name is required.');
		expect(submitAction).not.toHaveBeenCalled();
	});

	it('treats whitespace-only names as empty and trims what it sends', async () => {
		await render(emptyList);
		await setTitle('   ');
		await addItem(' Milk ');

		await submit();

		expect(element.textContent).toContain('Title is required.');
		expect(submitAction).not.toHaveBeenCalled();

		await setTitle('  Groceries ');
		await submit();

		expect(submitAction).toHaveBeenCalledWith({ title: 'Groceries', todos: [{ title: 'Milk', done: false }] });
	});

	it('adds and removes items', async () => {
		await render(emptyList);
		await addItem('Milk');
		await addItem('Bread');

		await removeItem(0);

		expect(rows()).toHaveLength(1);
		expect(itemInput(0).value).toBe('Bread');

		await removeItem(0);

		expect(rows()).toHaveLength(0);
		expect(element.querySelector('.todo-list-form__items-error')?.textContent).toContain('Add at least one item.');
	});

	it('focuses the name of a newly added item', async () => {
		await render(emptyList);

		await addItem();

		expect(document.activeElement).toBe(itemInput(0));
	});

	it('submits renamed items and their done state, with uuids for existing items', async () => {
		await render({ title: 'Groceries', todos: [{ uuid: 'a', title: 'Milk', done: false }] });

		await setItemTitle(0, 'Oat milk');
		await toggleItem(0);
		await addItem('Bread');
		await submit();

		expect(submitAction).toHaveBeenCalledWith({
			title: 'Groceries',
			todos: [
				{ uuid: 'a', title: 'Oat milk', done: true },
				{ title: 'Bread', done: false },
			],
		});
	});

	it('resets to the saved list and emits it after a successful save', async () => {
		const list = savedList({ todos: [{ uuid: 'b', title: 'Bread', done: false }] });
		submitAction.mockReturnValue(of(list));
		await render({ title: 'Groceries', todos: [] });
		await addItem('Bread');

		await submit();

		expect(saved).toHaveBeenCalledWith(list);

		await submit();

		expect(submitAction).toHaveBeenLastCalledWith({
			title: 'Groceries',
			todos: [{ uuid: 'b', title: 'Bread', done: false }],
		});
	});

	it('shows the API error and keeps the values', async () => {
		submitAction.mockReturnValue(
			throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'todo_list_with_same_title_exists' } }))
		);
		await render({ title: 'Groceries', todos: [{ uuid: 'a', title: 'Milk', done: false }] });

		await submit();

		expect(element.querySelector('[role="alert"]')?.textContent).toContain(
			'You already have a Todo list with this name.'
		);
		expect(titleInput().value).toBe('Groceries');
		expect(saved).not.toHaveBeenCalled();
	});

	it('sends one request when submit is clicked twice', async () => {
		submitAction.mockReturnValue(new Subject<TodoList>());
		await render({ title: 'Groceries', todos: [{ uuid: 'a', title: 'Milk', done: false }] });

		await submit();
		await submit();

		expect(submitAction).toHaveBeenCalledTimes(1);
		expect(submitButton().disabled).toBe(true);
	});

	it("ignores a pending save's response after the initial value changes", async () => {
		const response = new Subject<TodoList>();
		submitAction.mockReturnValue(response);
		await render({ title: 'Groceries', todos: [{ uuid: 'a', title: 'Milk', done: false }] });
		await submit();

		await render({ title: 'Movies', todos: [{ uuid: 'm', title: 'Alien', done: false }] });
		response.next(savedList());
		await fixture.whenStable();

		expect(titleInput().value).toBe('Movies');
		expect(itemInput(0).value).toBe('Alien');
		expect(saved).not.toHaveBeenCalled();
		expect(submitButton().disabled).toBe(false);
	});
});
