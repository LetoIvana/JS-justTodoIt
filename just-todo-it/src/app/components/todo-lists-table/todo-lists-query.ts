import { ParamMap } from '@angular/router';
import {
	TodoListSortBy,
	todoListSortByValues,
	TodoListSortDirection,
	todoListSortDirectionValues,
	TodoListsQuery,
} from '../../services/todo-lists.service';

export const defaultQuery: TodoListsQuery = { page: 1, sortBy: 'created', sortDirection: 'desc', title: '' };

// Anything missing or invalid in the URL falls back to the default, so a hand-edited URL still shows a usable table
export function parseQuery(params: ParamMap): TodoListsQuery {
	const page = Number(params.get('page'));
	const sortBy = params.get('sortBy') as TodoListSortBy;
	const sortDirection = params.get('sortDirection') as TodoListSortDirection;

	return {
		page: Number.isInteger(page) && page > 0 ? page : defaultQuery.page,
		sortBy: todoListSortByValues.includes(sortBy) ? sortBy : defaultQuery.sortBy,
		sortDirection: todoListSortDirectionValues.includes(sortDirection) ? sortDirection : defaultQuery.sortDirection,
		title: params.get('title')?.trim() ?? defaultQuery.title,
	};
}

export function isSameQuery(a: TodoListsQuery, b: TodoListsQuery): boolean {
	return a.page === b.page && a.sortBy === b.sortBy && a.sortDirection === b.sortDirection && a.title === b.title;
}

// Defaults are left out to keep the URL short; `undefined` removes the param
export function toQueryParams(query: TodoListsQuery): Record<string, string | number | undefined> {
	return {
		page: query.page === defaultQuery.page ? undefined : query.page,
		sortBy: query.sortBy === defaultQuery.sortBy ? undefined : query.sortBy,
		sortDirection: query.sortDirection === defaultQuery.sortDirection ? undefined : query.sortDirection,
		title: query.title || undefined,
	};
}

// The URL holds exactly what `toQueryParams` writes, so a hand-edited URL can be rewritten to match the table
export function isCanonicalQuery(params: ParamMap): boolean {
	const queryParams = toQueryParams(parseQuery(params));

	return (
		params.keys.every((key) => key in queryParams) &&
		Object.entries(queryParams).every(([key, value]) => params.get(key) === (value === undefined ? null : `${value}`))
	);
}
