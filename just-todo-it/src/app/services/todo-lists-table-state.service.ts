import { Injectable, signal } from '@angular/core';
import { Params } from '@angular/router';

// Lets pages link back to the Todo lists table as the user left it, not reset to the first page
@Injectable({ providedIn: 'root' })
export class TodoListsTableStateService {
	// The table's last query params, as written to the URL; empty until the table has been shown
	public readonly queryParams = signal<Params>({});
}
