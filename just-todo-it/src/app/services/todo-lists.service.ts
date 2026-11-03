import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TodoList, TodoListData } from '../models/todo-list';

export const todoListSortByValues = ['title', 'created'] as const;
export const todoListSortDirectionValues = ['asc', 'desc'] as const;

export type TodoListSortBy = (typeof todoListSortByValues)[number];
export type TodoListSortDirection = (typeof todoListSortDirectionValues)[number];

export interface TodoListsQuery {
	page: number;
	sortBy: TodoListSortBy;
	sortDirection: TodoListSortDirection;
	title: string;
}

export interface PagedTodoLists {
	todoLists: TodoList[];
	totalCount: number;
}

export const TODO_LISTS_PAGE_SIZE = 5;

@Injectable({ providedIn: 'root' })
export class TodoListsService {
	private readonly http = inject(HttpClient);
	private readonly todoListsUrl = `${environment.apiUrl}/todo-lists`;

	public getAll({ page, sortBy, sortDirection, title }: TodoListsQuery): Observable<PagedTodoLists> {
		// The API matches % and _ in the title as wildcards and can't escape them, so for those titles
		// it returns every candidate and the literal matches are filtered and paged here instead
		const hasWildcard = /[%_]/.test(title);
		const params = new HttpParams({
			fromObject: {
				pageNumber: hasWildcard ? 1 : page,
				pageSize: hasWildcard ? Number.MAX_SAFE_INTEGER : TODO_LISTS_PAGE_SIZE,
				sortBy,
				// The API only accepts uppercase directions
				sortDirection: sortDirection.toUpperCase(),
				...(title && { title }),
			},
		});

		// The body is only the requested page; the total is only in a header
		return this.http.get<TodoList[]>(this.todoListsUrl, { params, observe: 'response' }).pipe(
			map((response) => {
				const todoLists = response.body ?? [];

				if (!hasWildcard) {
					return { todoLists, totalCount: Number(response.headers.get('X-TOTAL-COUNT')) };
				}

				const matches = todoLists.filter((todoList) => todoList.title.toLowerCase().includes(title.toLowerCase()));

				return {
					todoLists: matches.slice((page - 1) * TODO_LISTS_PAGE_SIZE, page * TODO_LISTS_PAGE_SIZE),
					totalCount: matches.length,
				};
			})
		);
	}

	// Errors with 404 for a Todo list that doesn't exist or isn't the user's
	public getOne(uuid: string): Observable<TodoList> {
		return this.http.get<TodoList>(`${this.todoListsUrl}/${uuid}`, { params: { relations: 'todos' } });
	}

	// The API creates every item as not done, so only the titles are sent
	public create({ title, todos }: TodoListData): Observable<TodoList> {
		return this.http.post<TodoList>(this.todoListsUrl, { title, todos: todos.map(({ title }) => ({ title })) });
	}

	// The API replaces all of the list's items: ones with a uuid are updated, ones without are created
	// and any existing item that isn't sent is deleted
	public update(uuid: string, { title, todos }: TodoListData): Observable<TodoList> {
		return this.http.patch<TodoList>(`${this.todoListsUrl}/${uuid}`, {
			title,
			todos: todos.map(({ uuid, title, done }) => ({ ...(uuid && { uuid }), title, done })),
		});
	}

	public delete(uuid: string): Observable<void> {
		return this.http.delete<void>(`${this.todoListsUrl}/${uuid}`);
	}
}
