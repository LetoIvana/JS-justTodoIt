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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
	catchError,
	combineLatest,
	debounceTime,
	distinctUntilChanged,
	filter,
	finalize,
	map,
	Observable,
	of,
	startWith,
	Subject,
	switchMap,
	tap,
} from 'rxjs';
import { TodoList } from '../../models/todo-list';
import {
	PagedTodoLists,
	TODO_LISTS_PAGE_SIZE,
	TodoListSortBy,
	TodoListSortDirection,
	TodoListsQuery,
	TodoListsService,
} from '../../services/todo-lists.service';
import { getApiErrorMessage } from '../../utils/get-api-error-message';
import { ConfirmDialog, ConfirmDialogData } from '../confirm-dialog/confirm-dialog';
import { isCanonicalQuery, isSameQuery, parseQuery, toQueryParams } from './todo-lists-query';

const FILTER_DEBOUNCE_MS = 300;

function getLastPage(totalCount: number): number {
	// An empty result still has a first page to show the empty state on
	return Math.max(Math.ceil(totalCount / TODO_LISTS_PAGE_SIZE), 1);
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
			switchMap(([query]) => this.loadPage(query))
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
			// replaceUrl: searches don't add history entries, so Back leaves the page instead of stepping through each search
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

		// Unknown, invalid or default values in a hand-edited URL are replaced with what the table shows.
		// The parsed query stays the same, so this doesn't load the page again
		this.route.queryParamMap
			.pipe(
				filter((params) => !isCanonicalQuery(params)),
				takeUntilDestroyed()
			)
			.subscribe(() => this.navigate({}, true));
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

	// Errors are shown in the template and never complete `result`, so a later query can still load
	private loadPage(query: TodoListsQuery): Observable<PagedTodoLists | null> {
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
				// The previous rows would no longer match the sort and page shown above them
				return of(null);
			}),
			finalize(() => this.isLoading.set(false))
		);
	}

	private navigate(changes: Partial<TodoListsQuery>, replaceUrl = false): void {
		this.router.navigate([], {
			relativeTo: this.route,
			queryParams: toQueryParams({ ...this.query(), ...changes }),
			replaceUrl,
		});
	}
}
