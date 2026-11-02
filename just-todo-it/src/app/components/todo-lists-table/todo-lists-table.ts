import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle } from '@angular/material/expansion';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, MatSortHeader, Sort } from '@angular/material/sort';
import {
	MatCell,
	MatCellDef,
	MatColumnDef,
	MatHeaderCell,
	MatHeaderCellDef,
	MatHeaderRow,
	MatHeaderRowDef,
	MatRow,
	MatRowDef,
	MatTable,
} from '@angular/material/table';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import {
	catchError,
	combineLatest,
	debounceTime,
	distinctUntilChanged,
	EMPTY,
	filter,
	finalize,
	map,
	startWith,
	Subject,
	switchMap,
	tap,
} from 'rxjs';
import { TodoList } from '../../models/todo-list';
import {
	TODO_LISTS_PAGE_SIZE,
	TodoListSortBy,
	TodoListSortDirection,
	TodoListsQuery,
	TodoListsService,
} from '../../services/todo-lists.service';
import { getApiErrorMessage } from '../../utils/get-api-error-message';
import { ConfirmDialog, ConfirmDialogData } from '../confirm-dialog/confirm-dialog';

const FILTER_DEBOUNCE_MS = 300;
const sortByValues: TodoListSortBy[] = ['title', 'created'];
const sortDirectionValues: TodoListSortDirection[] = ['asc', 'desc'];
const defaultQuery: TodoListsQuery = { page: 1, sortBy: 'created', sortDirection: 'desc', title: '' };

// Anything missing or invalid in the URL falls back to the default, so a hand-edited URL still shows a usable table
function parseQuery(params: ParamMap): TodoListsQuery {
	const page = Number(params.get('page'));
	const sortBy = params.get('sortBy') as TodoListSortBy;
	const sortDirection = params.get('sortDirection') as TodoListSortDirection;

	return {
		page: Number.isInteger(page) && page > 0 ? page : defaultQuery.page,
		sortBy: sortByValues.includes(sortBy) ? sortBy : defaultQuery.sortBy,
		sortDirection: sortDirectionValues.includes(sortDirection) ? sortDirection : defaultQuery.sortDirection,
		title: params.get('title')?.trim() ?? defaultQuery.title,
	};
}

function getLastPage(totalCount: number): number {
	// An empty result still has a first page to show the empty state on
	return Math.max(Math.ceil(totalCount / TODO_LISTS_PAGE_SIZE), 1);
}

function isSameQuery(a: TodoListsQuery, b: TodoListsQuery): boolean {
	return a.page === b.page && a.sortBy === b.sortBy && a.sortDirection === b.sortDirection && a.title === b.title;
}

// Defaults are left out to keep the URL short; `undefined` removes the param
function toQueryParams(query: TodoListsQuery): Record<string, string | number | undefined> {
	return {
		page: query.page === defaultQuery.page ? undefined : query.page,
		sortBy: query.sortBy === defaultQuery.sortBy ? undefined : query.sortBy,
		sortDirection: query.sortDirection === defaultQuery.sortDirection ? undefined : query.sortDirection,
		title: query.title || undefined,
	};
}

/**
 * Paginated, sortable and filterable table of the user's Todo lists.
 * The page, sort and filter live in the URL's query params, so they survive reloads and back navigation.
 */
@Component({
	imports: [
		DatePipe,
		MatButton,
		MatCard,
		MatCell,
		MatCellDef,
		MatColumnDef,
		MatExpansionPanel,
		MatExpansionPanelHeader,
		MatExpansionPanelTitle,
		MatFormField,
		MatHeaderCell,
		MatHeaderCellDef,
		MatHeaderRow,
		MatHeaderRowDef,
		MatIcon,
		MatIconButton,
		MatInput,
		MatLabel,
		MatPaginator,
		MatProgressBar,
		MatRow,
		MatRowDef,
		MatSort,
		MatSortHeader,
		MatTable,
		ReactiveFormsModule,
		RouterLink,
	],
	selector: 'jti-todo-lists-table',
	styleUrl: './todo-lists-table.scss',
	templateUrl: './todo-lists-table.html',
})
export class TodoListsTable {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly todoListsService = inject(TodoListsService);
	private readonly dialog = inject(MatDialog);
	private readonly snackBar = inject(MatSnackBar);

	private readonly query$ = this.route.queryParamMap.pipe(map(parseQuery), distinctUntilChanged(isSameQuery));
	private readonly refresh$ = new Subject<void>();

	protected readonly columns = ['title', 'created', 'actions'];
	protected readonly pageSize = TODO_LISTS_PAGE_SIZE;
	protected readonly query = toSignal(this.query$, { requireSync: true });
	protected readonly filterControl = new FormControl(this.query().title, { nonNullable: true });
	// Open when arriving with a filter in the URL, so it's clear why some lists are missing
	protected readonly filtersExpanded = Boolean(this.query().title);
	protected readonly isLoading = signal(false);
	protected readonly errorMessage = signal<string | null>(null);
	protected readonly result = toSignal(
		combineLatest([this.query$, this.refresh$.pipe(startWith(undefined))]).pipe(
			// switchMap cancels the previous request, so a slow response for an older query can never overwrite a newer one
			switchMap(([query]) => {
				this.isLoading.set(true);

				return this.todoListsService.getAll(query).pipe(
					tap(() => this.errorMessage.set(null)),
					// Past the last page (e.g. its last row was deleted, or a hand-edited URL), redirect to it
					// and drop this response, since the redirect loads the right one
					filter(({ totalCount }) => {
						const lastPage = getLastPage(totalCount);
						if (query.page > lastPage) {
							this.navigate({ page: lastPage }, true);
						}

						return query.page <= lastPage;
					}),
					catchError((error: unknown) => {
						this.errorMessage.set(getApiErrorMessage(error));
						return EMPTY;
					}),
					finalize(() => this.isLoading.set(false))
				);
			})
		)
	);

	constructor() {
		this.filterControl.valueChanges
			.pipe(
				debounceTime(FILTER_DEBOUNCE_MS),
				map((title) => title.trim()),
				// Typing and then restoring the previous text before the debounce fires changes nothing
				filter((title) => title !== this.query().title),
				takeUntilDestroyed()
			)
			// replaceUrl: one history entry per search, not per pause while typing
			.subscribe((title) => this.navigate({ title, page: 1 }, true));

		// Back/forward navigation changes the filter without the user typing
		this.query$
			.pipe(
				map(({ title }) => title),
				distinctUntilChanged(),
				filter((title) => title !== this.filterControl.value.trim()),
				takeUntilDestroyed()
			)
			.subscribe((title) => this.filterControl.setValue(title, { emitEvent: false }));
	}

	protected onSortChange({ active, direction }: Sort): void {
		this.navigate({ sortBy: active as TodoListSortBy, sortDirection: direction as TodoListSortDirection, page: 1 });
	}

	protected onPageChange({ pageIndex }: PageEvent): void {
		// The paginator counts pages from 0, the API from 1
		this.navigate({ page: pageIndex + 1 });
	}

	protected onDelete(todoList: TodoList): void {
		this.dialog
			.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
				data: {
					title: 'Delete Todo list',
					message: `Are you sure you want to delete "${todoList.title}"?`,
					confirmLabel: 'Delete',
				},
			})
			.afterClosed()
			.pipe(
				filter(Boolean),
				switchMap(() => this.todoListsService.delete(todoList.uuid))
			)
			.subscribe({
				next: () => {
					this.snackBar.open(`"${todoList.title}" has been deleted.`, 'Close');
					this.refresh$.next();
				},
				error: (error: unknown) => this.snackBar.open(getApiErrorMessage(error), 'Close'),
			});
	}

	private navigate(changes: Partial<TodoListsQuery>, replaceUrl = false): void {
		this.router.navigate([], {
			relativeTo: this.route,
			queryParams: toQueryParams({ ...this.query(), ...changes }),
			replaceUrl,
		});
	}
}
