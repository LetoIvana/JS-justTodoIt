import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { TodoList } from '../models/todo-list';
import { PagedTodoLists, TODO_LISTS_PAGE_SIZE, TodoListsQuery, TodoListsService } from './todo-lists.service';

describe('TodoListsService', () => {
	const todoListsUrl = `${environment.apiUrl}/todo-lists`;
	const query: TodoListsQuery = { page: 1, sortBy: 'created', sortDirection: 'desc', title: '' };
	let service: TodoListsService;
	let httpTesting: HttpTestingController;

	function todoList(title: string): TodoList {
		return { uuid: title, title, created: '2026-01-01T00:00:00.000Z' };
	}

	function getAll(overrides: Partial<TodoListsQuery>): {
		request: HttpRequest<unknown>;
		flush: (body: TodoList[], total: number) => PagedTodoLists | undefined;
	} {
		let result: PagedTodoLists | undefined;
		service.getAll({ ...query, ...overrides }).subscribe((paged) => (result = paged));
		const testRequest = httpTesting.expectOne((request) => request.url === todoListsUrl);

		return {
			request: testRequest.request,
			flush: (body, total) => {
				testRequest.flush(body, { headers: { 'X-TOTAL-COUNT': `${total}` } });

				return result;
			},
		};
	}

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
		});

		service = TestBed.inject(TodoListsService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => httpTesting.verify());

	it('lets the API page a plain title search', () => {
		const { request, flush } = getAll({ page: 2, sortDirection: 'asc', title: 'groceries' });

		expect(request.params.get('pageNumber')).toBe('2');
		expect(request.params.get('pageSize')).toBe(`${TODO_LISTS_PAGE_SIZE}`);
		expect(request.params.get('sortDirection')).toBe('ASC');
		expect(request.params.get('title')).toBe('groceries');
		expect(flush([todoList('groceries')], 6)).toEqual({ todoLists: [todoList('groceries')], totalCount: 6 });
	});

	it('does not treat % in the title as a wildcard', () => {
		const { request, flush } = getAll({ title: '50%' });

		expect(request.params.get('pageNumber')).toBe('1');
		expect(request.params.get('pageSize')).toBe(`${Number.MAX_SAFE_INTEGER}`);
		expect(flush([todoList('50% off'), todoList('50 apples')], 2)).toEqual({
			todoLists: [todoList('50% off')],
			totalCount: 1,
		});
	});

	it('does not treat _ in the title as a wildcard', () => {
		const { flush } = getAll({ title: 'a_c' });

		expect(flush([todoList('a_c'), todoList('abc')], 2)).toEqual({ todoLists: [todoList('a_c')], totalCount: 1 });
	});

	it('ignores case when matching a title with % or _', () => {
		const { flush } = getAll({ title: '50% OFF' });

		expect(flush([todoList('50% off')], 1)).toEqual({ todoLists: [todoList('50% off')], totalCount: 1 });
	});

	it('pages the literal matches of a title with % or _ itself', () => {
		const matches = Array.from({ length: TODO_LISTS_PAGE_SIZE + 2 }, (_, index) => todoList(`${index}%`));
		const { flush } = getAll({ page: 2, title: '%' });

		expect(flush([...matches, todoList('no percent')], matches.length + 1)).toEqual({
			todoLists: matches.slice(TODO_LISTS_PAGE_SIZE),
			totalCount: matches.length,
		});
	});
	it('requests the items with a single Todo list', () => {
		service.getOne('1').subscribe();

		httpTesting.expectOne(`${todoListsUrl}/1?relations=todos`).flush(todoList('1'));
	});

	it('creates a Todo list with only the item titles', () => {
		service.create({ title: 'Groceries', todos: [{ title: 'Milk', done: true }] }).subscribe();
		const testRequest = httpTesting.expectOne(todoListsUrl);

		expect(testRequest.request.method).toBe('POST');
		expect(testRequest.request.body).toStrictEqual({ title: 'Groceries', todos: [{ title: 'Milk' }] });
		testRequest.flush(todoList('Groceries'));
	});

	it('updates a Todo list with every item, keeping uuids only for existing ones', () => {
		service
			.update('1', {
				title: 'Groceries',
				todos: [
					{ uuid: 'a', title: 'Milk', done: true },
					{ title: 'Bread', done: false },
				],
			})
			.subscribe();
		const testRequest = httpTesting.expectOne(`${todoListsUrl}/1`);

		expect(testRequest.request.method).toBe('PATCH');
		expect(testRequest.request.body).toStrictEqual({
			title: 'Groceries',
			todos: [
				{ uuid: 'a', title: 'Milk', done: true },
				{ title: 'Bread', done: false },
			],
		});
		testRequest.flush(todoList('Groceries'));
	});
});
