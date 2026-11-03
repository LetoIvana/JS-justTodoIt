import { HttpErrorResponse } from '@angular/common/http';

// The API's `message` is developer-facing, so user-facing text is mapped from the stable `code`
const errorMessages: Record<string, string> = {
	incorrect_email_or_password: 'Incorrect e-mail or password.',
	user_with_same_email_exists: 'An account with this e-mail already exists.',
	validation_error: 'Some of the entered data is invalid.',
	activation_token_expired_or_invalid: 'This activation link is invalid or has expired.',
	password_reset_token_expired_or_invalid: 'This password reset link is invalid or has expired.',
	todo_list_with_same_title_exists: 'You already have a Todo list with this name.',
	// Also returned when an item is renamed and its old name reused in the same save, since the API
	// creates new items before it renames existing ones
	resource_conflict:
		'Item names must be unique. If you renamed an item and reused its old name, save the rename first.',
};

const fallbackMessage = 'Something went wrong. Please try again.';

export function getApiErrorMessage(error: unknown): string {
	if (!(error instanceof HttpErrorResponse)) {
		return fallbackMessage;
	}

	if (error.status === 0) {
		return 'Unable to reach the server. Please try again later.';
	}

	const code: unknown = error.error?.code;

	return (typeof code === 'string' && errorMessages[code]) || fallbackMessage;
}
