import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { catchError, map, Observable, of, startWith, switchMap } from 'rxjs';
import { TodoListForm } from '../../components/todo-list-form/todo-list-form';
import { TodoList, TodoListData, toTodoListData } from '../../models/todo-list';
import { TodoListsService } from '../../services/todo-lists.service';
import { TodoListsTableStateService } from '../../services/todo-lists-table-state.service';
import { getApiErrorMessage } from '../../utils/get-api-error-message';

type TodoListState =
	| { status: 'loading' }
	| { status: 'loaded'; todoList: TodoList }
	| { status: 'not-found' }
	| { status: 'error'; message: string };

@Component({
	imports: [MatProgressBar, RouterLink, TodoListForm],
	selector: 'jti-todo-list-details-page',
	styleUrl: './todo-list-details-page.scss',
	templateUrl: './todo-list-details-page.html',
})
export class TodoListDetailsPage {
	private readonly todoListsService = inject(TodoListsService);
	private readonly snackBar = inject(MatSnackBar);

	// Bound from the `:uuid` route param
	public readonly uuid = input.required<string>();

	protected readonly state = toSignal(
		// switchMap: the page is reused when navigating straight to another list's details
		toObservable(this.uuid).pipe(switchMap((uuid) => this.loadTodoList(uuid))),
		{ initialValue: { status: 'loading' } as TodoListState }
	);
	// Computed, so the form only starts over when a list is loaded, not on every change detection
	protected readonly initialValue = computed(() => {
		const state = this.state();

		return state.status === 'loaded' ? toTodoListData(state.todoList) : null;
	});
	protected readonly tableQueryParams = inject(TodoListsTableStateService).queryParams;

	protected readonly save = (value: TodoListData): Observable<TodoList> =>
		this.todoListsService.update(this.uuid(), value);

	protected onSaved(): void {
		this.snackBar.open('Todo list saved', 'Close');
	}

	private loadTodoList(uuid: string): Observable<TodoListState> {
		return this.todoListsService.getOne(uuid).pipe(
			map((todoList): TodoListState => ({ status: 'loaded', todoList })),
			catchError((error: unknown) =>
				of<TodoListState>(
					error instanceof HttpErrorResponse && error.status === HttpStatusCode.NotFound
						? { status: 'not-found' }
						: { status: 'error', message: getApiErrorMessage(error) }
				)
			),
			startWith<TodoListState>({ status: 'loading' })
		);
	}
}
