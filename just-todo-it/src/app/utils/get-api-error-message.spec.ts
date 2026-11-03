import { HttpErrorResponse } from '@angular/common/http';
import { getApiErrorMessage } from './get-api-error-message';

describe('getApiErrorMessage', () => {
	function conflict(code: string): HttpErrorResponse {
		return new HttpErrorResponse({ status: 409, error: { code } });
	}

	it('explains that a Todo list with the same name already exists', () => {
		expect(getApiErrorMessage(conflict('todo_list_with_same_title_exists'))).toBe(
			'You already have a Todo list with this name.'
		);
	});

	it('explains that item names must be unique', () => {
		expect(getApiErrorMessage(conflict('resource_conflict'))).toBe(
			'Item names must be unique. If you renamed an item and reused its old name, save the rename first.'
		);
	});
});
