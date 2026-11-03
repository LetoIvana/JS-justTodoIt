import { Component, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { catchError, EMPTY, Observable, of, switchMap } from 'rxjs';
import { TodoListForm } from '../../components/todo-list-form/todo-list-form';
import { TodoList, TodoListData } from '../../models/todo-list';
import { TodoListsService } from '../../services/todo-lists.service';

@Component({
	imports: [TodoListForm],
	selector: 'jti-create-todo-list-page',
	templateUrl: './create-todo-list-page.html',
})
export class CreateTodoListPage {
	private readonly router = inject(Router);
	private readonly snackBar = inject(MatSnackBar);
	private readonly todoListsService = inject(TodoListsService);

	protected readonly emptyList: TodoListData = { title: '', todos: [] };

	// The API creates every item as not done, so the done items are saved with a follow-up update
	protected readonly create = (value: TodoListData): Observable<TodoList> =>
		this.todoListsService
			.create(value)
			.pipe(
				switchMap((created) =>
					value.todos.some(({ done }) => done) ? this.saveDoneItems(created, value) : of(created)
				)
			);

	protected onCreated(): void {
		this.snackBar.open('Todo list created', 'Close');
		this.router.navigate(['/']);
	}

	private saveDoneItems(created: TodoList, value: TodoListData): Observable<TodoList> {
		// The API returns the items in the order they were sent, so they're matched by position
		const todos = (created.todos ?? []).map(({ uuid, title }, index) => ({
			uuid,
			title,
			done: value.todos[index].done,
		}));

		return this.todoListsService.update(created.uuid, { title: created.title, todos }).pipe(
			// The list exists by now, so submitting the create form again could only fail on its name.
			// Its edit page is where the done items can be saved again
			catchError(() => {
				this.snackBar.open("The list was created, but its done items couldn't be saved.", 'Close');
				this.router.navigate(['/', created.uuid]);

				return EMPTY;
			})
		);
	}
}
