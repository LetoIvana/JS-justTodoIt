import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { TodoList } from '../../models/todo-list';
import { TodoListsTableStateService } from '../../services/todo-lists-table-state.service';
import { TodoListDetailsPage } from './todo-list-details-page';

describe('TodoListDetailsPage', () => {
	const todoListsUrl = `${environment.apiUrl}/todo-lists`;
	const groceries: TodoList = {
		uuid: '1',
		title: 'Groceries',
		created: '2026-01-01T00:00:00.000Z',
		todos: [
			{ uuid: 'a', title: 'Milk', done: false },
			{ uuid: 'b', title: 'Bread', done: true },
		],
	};
	let fixture: ComponentFixture<TodoListDetailsPage>;
	let element: HTMLElement;
	let httpTesting: HttpTestingController;

	async function render(uuid: string, respond: (url: string) => void): Promise<void> {
		fixture.componentRef.setInput('uuid', uuid);
		fixture.detectChanges();
		respond(`${todoListsUrl}/${uuid}?relations=todos`);
		await fixture.whenStable();
	}

	async function renderGroceries(): Promise<void> {
		await render('1', (url) => httpTesting.expectOne(url).flush(groceries));
	}

	function rows(): HTMLElement[] {
		return [...element.querySelectorAll<HTMLElement>('.todo-list-form__item')];
	}

	function itemInput(index: number): HTMLInputElement {
		return rows()[index].querySelector<HTMLInputElement>('.todo-list-form__item-title input')!;
	}

	async function type(input: HTMLInputElement, value: string): Promise<void> {
		input.value = value;
		input.dispatchEvent(new Event('input'));
		await fixture.whenStable();
	}

	async function click(target: HTMLElement): Promise<void> {
		target.click();
		await fixture.whenStable();
	}

	async function addItem(title: string): Promise<void> {
		await click(
			[...element.querySelectorAll<HTMLButtonElement>('button')].find(
				(button) => button.textContent?.trim() === 'Add item'
			)!
		);
		await type(itemInput(rows().length - 1), title);
	}

	async function save(): Promise<void> {
		await click(element.querySelector<HTMLButtonElement>('button[type="submit"]')!);
	}

	function backLink(): HTMLAnchorElement | undefined {
		return [...element.querySelectorAll('a')].find((link) => /Back to todo lists/i.test(link.textContent ?? ''));
	}

	// The snack bar is rendered in an overlay outside the page
	function snackBarText(): string | undefined {
		return document.querySelector('mat-snack-bar-container')?.textContent;
	}

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TodoListDetailsPage],
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
			],
		}).compileComponents();

		TestBed.inject(TodoListsTableStateService).queryParams.set({ page: 2 });
		fixture = TestBed.createComponent(TodoListDetailsPage);
		element = fixture.nativeElement;
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => httpTesting.verify());

	it('shows the edit form prefilled with the list and its items', async () => {
		await renderGroceries();

		expect(element.querySelector('h1')?.textContent).toContain('Edit todo list');
		expect(element.querySelector<HTMLInputElement>('.todo-list-form__title input')?.value).toBe('Groceries');
		expect(rows().map((_, index) => itemInput(index).value)).toEqual(['Milk', 'Bread']);
		expect(rows()[1].querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
		expect(backLink()?.getAttribute('href')).toBe('/?page=2');
	});

	it('sends every item when saving: existing with uuid, new without, removed left out', async () => {
		vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
		await renderGroceries();

		await click(rows()[0].querySelector<HTMLButtonElement>('button[aria-label="Remove Milk"]')!);
		await type(itemInput(0), 'Rye bread');
		await click(rows()[0].querySelector<HTMLInputElement>('input[type="checkbox"]')!);
		await addItem('Eggs');
		await save();

		const request = httpTesting.expectOne({ method: 'PATCH', url: `${todoListsUrl}/1` });
		expect(request.request.body).toEqual({
			title: 'Groceries',
			todos: [
				{ uuid: 'b', title: 'Rye bread', done: false },
				{ title: 'Eggs', done: false },
			],
		});
		request.flush({
			...groceries,
			todos: [
				{ uuid: 'b', title: 'Rye bread', done: false },
				{ uuid: 'e', title: 'Eggs', done: false },
			],
		});
		await fixture.whenStable();

		expect(snackBarText()).toContain('Todo list saved');
	});

	it('returns to the table as the user left it after saving', async () => {
		const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
		await renderGroceries();

		await save();
		httpTesting.expectOne({ method: 'PATCH', url: `${todoListsUrl}/1` }).flush(groceries);
		await fixture.whenStable();

		expect(navigateSpy).toHaveBeenCalledWith(['/'], { queryParams: { page: 2 } });
	});

	it('stays on the page when saving fails', async () => {
		const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
		await renderGroceries();

		await save();
		httpTesting
			.expectOne({ method: 'PATCH', url: `${todoListsUrl}/1` })
			.flush(null, { status: 500, statusText: 'Server Error' });
		await fixture.whenStable();

		expect(navigateSpy).not.toHaveBeenCalled();
	});

	it('cancels a pending save when switching to another list', async () => {
		await renderGroceries();
		await save();
		const pendingSave = httpTesting.expectOne({ method: 'PATCH', url: `${todoListsUrl}/1` });

		await render('2', (url) => httpTesting.expectOne(url).flush({ ...groceries, uuid: '2', title: 'Movies' }));

		expect(pendingSave.cancelled).toBe(true);
	});

	it('shows a readable error when two items share a name', async () => {
		await renderGroceries();

		await save();
		httpTesting
			.expectOne({ method: 'PATCH', url: `${todoListsUrl}/1` })
			.flush({ code: 'resource_conflict' }, { status: 409, statusText: 'Conflict' });
		await fixture.whenStable();

		expect(element.querySelector('[role="alert"]')?.textContent).toContain('Item names must be unique.');
	});

	it("shows a not-found state for a Todo list that doesn't exist or isn't the user's", async () => {
		await render('unknown', (url) => httpTesting.expectOne(url).flush(null, { status: 404, statusText: 'Not Found' }));

		expect(element.querySelector('[role="alert"]')?.textContent).toContain('Todo list not found');
		expect(backLink()?.getAttribute('href')).toBe('/?page=2');
	});

	it('shows an error when the Todo list fails to load', async () => {
		await render('1', (url) => httpTesting.expectOne(url).flush(null, { status: 500, statusText: 'Server Error' }));

		expect(element.querySelector('[role="alert"]')?.textContent).toContain('Something went wrong');
		expect(element.querySelector('[role="alert"]')?.textContent).not.toContain('not found');
	});
});
