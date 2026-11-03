import { convertToParamMap } from '@angular/router';
import { TodoListsQuery } from '../../services/todo-lists.service';
import { defaultQuery, isCanonicalQuery, isSameQuery, parseQuery, toQueryParams } from './todo-lists-query';

describe('parseQuery', () => {
	it('reads the page, sort and filter from the URL', () => {
		const params = convertToParamMap({ page: '3', sortBy: 'title', sortDirection: 'asc', title: ' shop ' });

		expect(parseQuery(params)).toEqual({ page: 3, sortBy: 'title', sortDirection: 'asc', title: 'shop' });
	});

	it('falls back to the defaults when the URL has no params', () => {
		expect(parseQuery(convertToParamMap({}))).toEqual(defaultQuery);
	});

	it.each(['abc', '0', '-1', '1.5'])('falls back to the first page when the page is "%s"', (page) => {
		expect(parseQuery(convertToParamMap({ page })).page).toBe(1);
	});

	it('falls back to the default sort when the sort values are unknown', () => {
		const query = parseQuery(convertToParamMap({ sortBy: 'owner', sortDirection: 'ASC' }));

		expect(query.sortBy).toBe('created');
		expect(query.sortDirection).toBe('desc');
	});
});

describe('isSameQuery', () => {
	it.each<[keyof TodoListsQuery, TodoListsQuery[keyof TodoListsQuery]]>([
		['page', 2],
		['sortBy', 'title'],
		['sortDirection', 'asc'],
		['title', 'shop'],
	])('tells queries apart that differ only in %s', (key, value) => {
		expect(isSameQuery(defaultQuery, { ...defaultQuery, [key]: value })).toBe(false);
	});

	it('treats queries with equal values as the same', () => {
		expect(isSameQuery(defaultQuery, { ...defaultQuery })).toBe(true);
	});
});

describe('toQueryParams', () => {
	it('leaves out every default value', () => {
		expect(toQueryParams(defaultQuery)).toEqual({
			page: undefined,
			sortBy: undefined,
			sortDirection: undefined,
			title: undefined,
		});
	});

	it('keeps every value that differs from the default', () => {
		const query: TodoListsQuery = { page: 2, sortBy: 'title', sortDirection: 'asc', title: 'shop' };

		expect(toQueryParams(query)).toEqual(query);
	});

	it('reads back as the same query', () => {
		const query: TodoListsQuery = { page: 2, sortBy: 'title', sortDirection: 'asc', title: 'shop' };
		const params = Object.fromEntries(Object.entries(toQueryParams(query)).map(([key, value]) => [key, `${value}`]));

		expect(parseQuery(convertToParamMap(params))).toEqual(query);
	});
});

describe('isCanonicalQuery', () => {
	it.each([{}, { page: '2', sortBy: 'title', sortDirection: 'asc', title: 'shop' }])(
		'accepts params that are exactly what the query would write: %o',
		(params) => {
			expect(isCanonicalQuery(convertToParamMap(params))).toBe(true);
		}
	);

	it.each([{ sortDirection: 'rgdfs' }, { sortBy: 'owner' }, { page: 'abc' }, { page: '0' }])(
		'rejects invalid values: %o',
		(params) => {
			expect(isCanonicalQuery(convertToParamMap(params))).toBe(false);
		}
	);

	it.each([{ page: '1' }, { sortBy: 'created' }, { sortDirection: 'desc' }, { title: '' }])(
		'rejects default values, which are left out of the URL: %o',
		(params) => {
			expect(isCanonicalQuery(convertToParamMap(params))).toBe(false);
		}
	);

	it('rejects a title with surrounding whitespace', () => {
		expect(isCanonicalQuery(convertToParamMap({ title: ' shop ' }))).toBe(false);
	});

	it.each([{ foo: 'bar' }, { page: '2', foo: 'bar' }])('rejects params the table does not use: %o', (params) => {
		expect(isCanonicalQuery(convertToParamMap(params))).toBe(false);
	});
});
