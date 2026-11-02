import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatProgressBar } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { catchError, map, Observable, of, startWith, switchMap } from 'rxjs';
import { TodoList } from '../../models/todo-list';
import { TodoListsService } from '../../services/todo-lists.service';
import { getApiErrorMessage } from '../../utils/get-api-error-message';

type TodoListState =
	| { status: 'loading' }
	| { status: 'loaded'; todoList: TodoList }
	| { status: 'not-found' }
	| { status: 'error'; message: string };

@Component({
	imports: [MatProgressBar, RouterLink],
	selector: 'jti-todo-list-details-page',
	styleUrl: './todo-list-details-page.scss',
	templateUrl: './todo-list-details-page.html',
})
export class TodoListDetailsPage {
	private readonly todoListsService = inject(TodoListsService);

	// Bound from the `:uuid` route param
	public readonly uuid = input.required<string>();

	protected readonly state = toSignal(
		// switchMap: the page is reused when navigating straight to another list's details
		toObservable(this.uuid).pipe(switchMap((uuid) => this.loadTodoList(uuid))),
		{ initialValue: { status: 'loading' } as TodoListState }
	);

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
