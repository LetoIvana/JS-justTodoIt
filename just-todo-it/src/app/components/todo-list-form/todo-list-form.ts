import {
	afterNextRender,
	Component,
	DestroyRef,
	effect,
	ElementRef,
	inject,
	Injector,
	input,
	output,
	signal,
	untracked,
	viewChildren,
} from '@angular/core';
import {
	AbstractControl,
	FormControl,
	FormGroup,
	NonNullableFormBuilder,
	ReactiveFormsModule,
	ValidationErrors,
} from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { finalize, Observable, Subscription } from 'rxjs';
import { TodoItemData, TodoList, TodoListData, toTodoListData } from '../../models/todo-list';
import { getApiErrorMessage } from '../../utils/get-api-error-message';

type TodoItemGroup = FormGroup<{
	// Empty for an item that hasn't been saved yet
	uuid: FormControl<string>;
	title: FormControl<string>;
	done: FormControl<boolean>;
}>;

// A name of only spaces would show as a blank row in the table, so it counts as missing
function requiredTrimmed(control: AbstractControl<string>): ValidationErrors | null {
	return control.value.trim() ? null : { required: true };
}

// Material also shows errors on every field once the form has been submitted, which would flag an item added
// after a save straight away. An invalid submit marks every field as touched, so touched alone is enough
const touchedErrorStateMatcher: ErrorStateMatcher = {
	isErrorState: (control) => !!control?.invalid && control.touched,
};

function atLeastOneItem(control: AbstractControl<unknown[]>): ValidationErrors | null {
	return control.value.length ? null : { noItems: true };
}

/**
 * Todo list form shared by creating and editing a list, so both have the same fields, validation and item handling.
 * The parent passes the starting values and the API call; the form sends the complete list, since the API replaces
 * all of a list's items on every update, and resets to the saved list so new items keep their uuids on the next save.
 */
@Component({
	imports: [
		MatButton,
		MatCheckbox,
		MatError,
		MatFormField,
		MatIcon,
		MatIconButton,
		MatInput,
		MatLabel,
		ReactiveFormsModule,
	],
	providers: [{ provide: ErrorStateMatcher, useValue: touchedErrorStateMatcher }],
	selector: 'jti-todo-list-form',
	styleUrl: './todo-list-form.scss',
	templateUrl: './todo-list-form.html',
})
export class TodoListForm {
	private readonly formBuilder = inject(NonNullableFormBuilder);
	private readonly injector = inject(Injector);
	private readonly itemTitleInputs = viewChildren<ElementRef<HTMLInputElement>>('itemTitleInput');
	private submitSubscription?: Subscription;

	public readonly initialValue = input.required<TodoListData>();
	public readonly submitLabel = input.required<string>();
	public readonly submitAction = input.required<(value: TodoListData) => Observable<TodoList>>();
	public readonly saved = output<TodoList>();

	protected readonly form = this.formBuilder.group({
		title: ['', requiredTrimmed],
		todos: this.formBuilder.array<TodoItemGroup>([], atLeastOneItem),
	});
	protected readonly isSubmitting = signal(false);
	protected readonly errorMessage = signal<string | null>(null);

	constructor() {
		effect(() => {
			const initialValue = this.initialValue();

			untracked(() => {
				// A save still in flight belongs to the previous list, so its response must not reset this one
				this.submitSubscription?.unsubscribe();
				this.reset(initialValue);
			});
		});

		// A save still in flight when the user leaves must not navigate them or report on a form that's gone
		inject(DestroyRef).onDestroy(() => this.submitSubscription?.unsubscribe());
	}

	protected addItem(): void {
		this.form.controls.todos.push(this.createItem({ title: '', done: false }));
		afterNextRender(() => this.itemTitleInputs().at(-1)?.nativeElement.focus(), { injector: this.injector });
	}

	protected removeItem(index: number): void {
		this.form.controls.todos.removeAt(index);
		// Removing the last item shows the error straight away
		this.form.controls.todos.markAsTouched();
	}

	protected onSubmit(): void {
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}

		const { title, todos } = this.form.getRawValue();
		const value: TodoListData = {
			title: title.trim(),
			todos: todos.map(({ uuid, title, done }) => ({ ...(uuid && { uuid }), title: title.trim(), done })),
		};

		this.isSubmitting.set(true);
		this.errorMessage.set(null);
		// Nothing can change while the request is in flight, so the saved list is the one the user sees
		this.form.disable();

		this.submitSubscription = this.submitAction()(value)
			.pipe(
				finalize(() => {
					this.isSubmitting.set(false);
					this.form.enable();
				})
			)
			.subscribe({
				next: (todoList) => {
					this.reset(toTodoListData(todoList));
					this.saved.emit(todoList);
				},
				error: (error: unknown) => this.errorMessage.set(getApiErrorMessage(error)),
			});
	}

	private reset({ title, todos }: TodoListData): void {
		this.form.controls.title.reset(title);
		this.form.controls.todos.clear();
		todos.forEach((item) => this.form.controls.todos.push(this.createItem(item)));
		this.form.controls.todos.markAsUntouched();
		this.errorMessage.set(null);
	}

	private createItem({ uuid = '', title, done }: TodoItemData): TodoItemGroup {
		return this.formBuilder.group({ uuid, title: [title, requiredTrimmed], done });
	}
}
