import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
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
	SortDirection,
	TODO_LISTS_PAGE_SIZE,
	TodoListSortBy,
	TodoListsQuery,
	TodoListsService,
} from '../../services/todo-lists.service';
import { getApiErrorMessage } from '../../utils/get-api-error-message';
import { ConfirmDialog, ConfirmDialogData } from '../confirm-dialog/confirm-dialog';

const FILTER_DEBOUNCE_MS = 300;
const sortByValues: TodoListSortBy[] = ['title', 'created'];
const sortDirectionValues: SortDirection[] = ['asc', 'desc'];
const defaultQuery: TodoListsQuery = { page: 1, sortBy: 'created', sortDirection: 'desc', title: '' };

// Anything missing or invalid in the URL falls back to the default, so a hand-edited URL still shows a usable table
function parseQuery(params: ParamMap): TodoListsQuery {
	const page = Number(params.get('page'));
	const sortBy = params.get('sortBy') as TodoListSortBy;
	const sortDirection = params.get('sortDirection') as SortDirection;

	return {
		page: Number.isInteger(page) && page > 0 ? page : defaultQuery.page,
		sortBy: sortByValues.includes(sortBy) ? sortBy : defaultQuery.sortBy,
		sortDirection: sortDirectionValues.includes(sortDirection) ? sortDirection : defaultQuery.sortDirection,
		title: params.get('title')?.trim() ?? defaultQuery.title,
	};
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
		MatCell,
		MatCellDef,
		MatColumnDef,
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
	protected readonly isLoading = signal(false);
	protected readonly errorMessage = signal<string | null>(null);
	protected readonly result = toSignal(
		combineLatest([this.query$, this.refresh$.pipe(startWith(undefined))]).pipe(
			// switchMap cancels the previous request, so a slow response for an older query can never overwrite a newer one
			switchMap(([query]) => {
				this.isLoading.set(true);

				return this.todoListsService.getAll(query).pipe(
					tap(() => this.errorMessage.set(null)),
					// e.g. the last row of the last page was deleted, or the URL points past the end
					filter(({ totalCount }) => {
						const lastPage = Math.max(Math.ceil(totalCount / TODO_LISTS_PAGE_SIZE), 1);
						if (query.page <= lastPage) {
							return true;
						}

						this.navigate({ page: lastPage }, true);
						return false;
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
		this.navigate({ sortBy: active as TodoListSortBy, sortDirection: direction as SortDirection, page: 1 });
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
				next: () => this.refresh$.next(),
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
