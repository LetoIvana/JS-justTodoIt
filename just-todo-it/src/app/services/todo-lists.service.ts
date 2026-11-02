import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TodoList } from '../models/todo-list';

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
		const params = new HttpParams({
			fromObject: {
				pageNumber: page,
				pageSize: TODO_LISTS_PAGE_SIZE,
				sortBy,
				// The API only accepts uppercase directions
				sortDirection: sortDirection.toUpperCase(),
				...(title && { title }),
			},
		});

		// The body is only the requested page; the total is only in a header
		return this.http.get<TodoList[]>(this.todoListsUrl, { params, observe: 'response' }).pipe(
			map((response) => ({
				todoLists: response.body ?? [],
				totalCount: Number(response.headers.get('X-TOTAL-COUNT')),
			}))
		);
	}

	public delete(uuid: string): Observable<void> {
		return this.http.delete<void>(`${this.todoListsUrl}/${uuid}`);
	}
}
