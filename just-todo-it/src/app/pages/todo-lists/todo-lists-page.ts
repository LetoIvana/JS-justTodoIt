import { Component } from '@angular/core';
import { TodoListsTable } from '../../components/todo-lists-table/todo-lists-table';

@Component({
	imports: [TodoListsTable],
	selector: 'jti-todo-lists-page',
	templateUrl: './todo-lists-page.html',
})
export class TodoListsPage {}
