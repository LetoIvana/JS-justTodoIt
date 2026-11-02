import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../environments/environment';
import { TodoList } from '../../models/todo-list';
import { TodoListsTable } from './todo-lists-table';

describe('TodoListsTable', () => {
	const todoListsUrl = `${environment.apiUrl}/todo-lists`;
	let harness: RouterTestingHarness;
	let httpTesting: HttpTestingController;

	function createTodoLists(count: number): TodoList[] {
		return Array.from({ length: count }, (_, index) => ({
			uuid: `${index + 1}`,
			title: `List ${index + 1}`,
			created: new Date(2026, 0, index + 1).toISOString(),
		}));
	}

	function expectListRequest(): TestRequest {
		return httpTesting.expectOne((request) => request.method === 'GET' && request.url === todoListsUrl);
	}

	function flushList(request: TestRequest, todoLists: TodoList[], totalCount = todoLists.length): void {
		request.flush(todoLists, { headers: { 'X-TOTAL-COUNT': `${totalCount}` } });
	}

	function queryParams(request: TestRequest): Record<string, string | null> {
		const { params } = request.request;
		return Object.fromEntries(params.keys().map((key) => [key, params.get(key)]));
	}

	function element(): HTMLElement {
		return harness.routeNativeElement!;
	}

	function rowTitles(): string[] {
		return [...element().querySelectorAll('tr[mat-row] td:first-child')].map((cell) => cell.textContent!.trim());
	}

	function button(label: string): HTMLButtonElement {
		return element().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
	}

	// The paginator keeps its buttons focusable when disabled, so it only sets `aria-disabled`
	function isDisabled(label: string): boolean {
		return button(label).getAttribute('aria-disabled') === 'true';
	}

	async function open(url = '/'): Promise<void> {
		await harness.navigateByUrl(url);
		await harness.fixture.whenStable();
	}

	function filterInput(): HTMLInputElement {
		return element().querySelector<HTMLInputElement>('input[type="search"]')!;
	}

	function typeFilter(value: string): void {
		const input = filterInput();
		input.value = value;
		input.dispatchEvent(new Event('input'));
	}

	// The snack bar is rendered in an overlay outside the table
	function snackBarText(): string | undefined {
		return document.querySelector('mat-snack-bar-container')?.textContent;
	}

	async function stable(): Promise<void> {
		await harness.fixture.whenStable();
	}

	beforeEach(async () => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([{ path: '', component: TodoListsTable }]),
				provideHttpClient(),
				provideHttpClientTesting(),
				// The dialog only reports that it closed once its close animation ends
				{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
			],
		});

		harness = await RouterTestingHarness.create();
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		vi.useRealTimers();
		httpTesting.verify();
	});

	it('loads the first page sorted by date created, newest first, by default', async () => {
		await open();

		expect(queryParams(expectListRequest())).toEqual({
			pageNumber: '1',
			pageSize: '5',
			sortBy: 'created',
			sortDirection: 'DESC',
		});
	});

	it("shows the user's Todo lists with the total count", async () => {
		await open();

		flushList(expectListRequest(), createTodoLists(5), 12);
		await stable();

		expect(rowTitles()).toEqual(['List 1', 'List 2', 'List 3', 'List 4', 'List 5']);
		expect(element().querySelector('.mat-mdc-paginator-range-label')?.textContent).toContain('1 – 5 of 12');
	});

	it("links each row's Details button to that Todo list's details page", async () => {
		await open();

		flushList(expectListRequest(), createTodoLists(1));
		await stable();

		const detailsLink = element().querySelector<HTMLAnchorElement>('a[aria-label="Details of List 1"]')!;
		expect(detailsLink.textContent?.trim()).toBe('Details');
		expect(detailsLink.getAttribute('href')).toBe('/1');
	});

	it('shows an empty state when the user has no Todo lists', async () => {
		await open();

		flushList(expectListRequest(), []);
		await stable();

		expect(element().querySelector('table')).toBeNull();
		expect(element().textContent).toContain("You don't have any Todo lists yet.");
	});

	it('shows an error when loading fails, and clears it after the next successful load', async () => {
		await open();

		expectListRequest().flush(null, { status: 500, statusText: 'Server Error' });
		await stable();

		const alert = () => element().querySelector('[role="alert"]');
		expect(alert()?.textContent).toContain('Something went wrong. Please try again.');

		await open('/?page=2');
		flushList(expectListRequest(), createTodoLists(5), 7);
		await stable();

		expect(alert()).toBeNull();
		expect(rowTitles()).toHaveLength(5);
	});

	it('restores the page, sort and filter from the URL', async () => {
		await open('/?page=2&sortBy=title&sortDirection=asc&title=shop');

		expect(queryParams(expectListRequest())).toEqual({
			pageNumber: '2',
			pageSize: '5',
			sortBy: 'title',
			sortDirection: 'ASC',
			title: 'shop',
		});
		expect(filterInput().value).toBe('shop');
		expect(element().querySelector('mat-expansion-panel')?.classList).toContain('mat-expanded');
	});

	it('keeps the filters collapsed when the URL has no filter', async () => {
		await open();

		expectListRequest();
		expect(element().querySelector('mat-expansion-panel')?.classList).not.toContain('mat-expanded');
	});

	it('moves between pages and keeps the page in the URL', async () => {
		await open();
		flushList(expectListRequest(), createTodoLists(5), 7);
		await stable();

		expect(isDisabled('Previous page')).toBe(true);

		button('Next page').click();
		await stable();

		expect(TestBed.inject(Router).url).toBe('/?page=2');
		const request = expectListRequest();
		expect(queryParams(request)['pageNumber']).toBe('2');
		flushList(request, createTodoLists(2), 7);
		await stable();

		expect(element().querySelector('.mat-mdc-paginator-range-label')?.textContent).toContain('6 – 7 of 7');
		expect(isDisabled('Next page')).toBe(true);
		expect(isDisabled('Previous page')).toBe(false);
	});

	it('disables previous and next when everything fits on one page', async () => {
		await open();

		flushList(expectListRequest(), createTodoLists(3));
		await stable();

		expect(isDisabled('Previous page')).toBe(true);
		expect(isDisabled('Next page')).toBe(true);
	});

	it('moves to the last page when the URL points past it', async () => {
		await open('/?page=4');

		flushList(expectListRequest(), [], 7);
		await stable();

		expect(TestBed.inject(Router).url).toBe('/?page=2');
		expect(queryParams(expectListRequest())['pageNumber']).toBe('2');
	});

	it('sorts by name in both directions, starting from the first page', async () => {
		await open('/?page=2');
		flushList(expectListRequest(), createTodoLists(5), 12);
		await stable();

		const nameHeader = () => element().querySelector<HTMLElement>('th[mat-sort-header] .mat-sort-header-container')!;

		nameHeader().click();
		await stable();

		expect(TestBed.inject(Router).url).toBe('/?sortBy=title&sortDirection=asc');
		let request = expectListRequest();
		expect(queryParams(request)).toMatchObject({ pageNumber: '1', sortBy: 'title', sortDirection: 'ASC' });
		flushList(request, createTodoLists(5), 12);
		await stable();

		nameHeader().click();
		await stable();

		request = expectListRequest();
		expect(queryParams(request)).toMatchObject({ sortBy: 'title', sortDirection: 'DESC' });
		flushList(request, createTodoLists(5), 12);
	});

	it('updates the filter input when the URL changes without typing, e.g. on back navigation', async () => {
		await open('/?title=shop');
		flushList(expectListRequest(), []);
		await stable();

		await open('/');
		flushList(expectListRequest(), createTodoLists(1));
		vi.useFakeTimers();
		await vi.advanceTimersByTimeAsync(300);

		expect(filterInput().value).toBe('');
		// Updating the input must not start a search of its own
		httpTesting.expectNone(todoListsUrl);
		expect(TestBed.inject(Router).url).toBe('/');
	});

	describe('filtering', () => {
		beforeEach(async () => {
			await open('/?page=2');
			flushList(expectListRequest(), createTodoLists(5), 12);
			await stable();
			vi.useFakeTimers();
		});

		it('makes one request after the user pauses typing, starting from the first page', async () => {
			typeFilter('s');
			await vi.advanceTimersByTimeAsync(100);
			typeFilter('sh');
			await vi.advanceTimersByTimeAsync(100);
			typeFilter('shop');
			await vi.advanceTimersByTimeAsync(299);

			httpTesting.expectNone(todoListsUrl);

			await vi.advanceTimersByTimeAsync(1);

			const request = expectListRequest();
			expect(queryParams(request)).toMatchObject({ pageNumber: '1', title: 'shop' });
			expect(TestBed.inject(Router).url).toBe('/?title=shop');
			flushList(request, []);
		});

		it('makes no request when the input is restored before the debounce fires', async () => {
			typeFilter('shop');
			await vi.advanceTimersByTimeAsync(100);
			typeFilter('');
			await vi.advanceTimersByTimeAsync(300);

			httpTesting.expectNone(todoListsUrl);
		});

		it('shows the results for the latest input when an earlier response arrives later', async () => {
			typeFilter('sh');
			await vi.advanceTimersByTimeAsync(300);
			const earlierRequest = expectListRequest();

			typeFilter('shop');
			await vi.advanceTimersByTimeAsync(300);
			const laterRequest = expectListRequest();

			flushList(laterRequest, [{ uuid: '1', title: 'Shopping', created: '2026-01-01T00:00:00.000Z' }]);
			await vi.advanceTimersByTimeAsync(100);

			expect(earlierRequest.cancelled).toBe(true);
			expect(rowTitles()).toEqual(['Shopping']);
		});

		it('shows an empty state when nothing matches the filter', async () => {
			typeFilter('nothing');
			await vi.advanceTimersByTimeAsync(300);

			flushList(expectListRequest(), []);
			await vi.advanceTimersByTimeAsync(100);

			expect(element().textContent).toContain('No Todo lists match "nothing".');
		});
	});

	describe('deleting', () => {
		async function clickDelete(title: string): Promise<void> {
			button(`Delete ${title}`).click();
			await stable();
		}

		function dialogButton(label: string): HTMLButtonElement {
			return [...document.querySelectorAll<HTMLButtonElement>('mat-dialog-actions button')].find(
				(dialogButton) => dialogButton.textContent?.trim() === label
			)!;
		}

		beforeEach(async () => {
			await open();
			flushList(expectListRequest(), createTodoLists(2));
			await stable();
		});

		it('asks for confirmation, then deletes, confirms the deletion and reloads the table', async () => {
			await clickDelete('List 1');

			expect(document.querySelector('mat-dialog-content')?.textContent).toContain('"List 1"');

			dialogButton('Delete').click();
			await stable();

			httpTesting.expectOne({ method: 'DELETE', url: `${todoListsUrl}/1` }).flush(null);
			await stable();

			expect(snackBarText()).toContain('"List 1" has been deleted.');

			flushList(expectListRequest(), createTodoLists(2).slice(1));
			await stable();

			expect(rowTitles()).toEqual(['List 2']);
		});

		it('shows an error and keeps the table when deleting fails', async () => {
			await clickDelete('List 1');

			dialogButton('Delete').click();
			await stable();

			httpTesting
				.expectOne({ method: 'DELETE', url: `${todoListsUrl}/1` })
				.flush(null, { status: 500, statusText: 'Server Error' });
			await stable();

			expect(snackBarText()).toContain('Something went wrong. Please try again.');
			httpTesting.expectNone(todoListsUrl);
			expect(rowTitles()).toEqual(['List 1', 'List 2']);
		});

		it('leaves everything unchanged when cancelled', async () => {
			await clickDelete('List 1');

			dialogButton('Cancel').click();
			await stable();

			httpTesting.expectNone({ method: 'DELETE' });
			expect(rowTitles()).toEqual(['List 1', 'List 2']);
		});
	});
});
