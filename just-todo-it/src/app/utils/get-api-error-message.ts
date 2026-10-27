import { HttpErrorResponse } from '@angular/common/http';

// The API's `message` is developer-facing, so user-facing text is mapped from the stable `code`
const errorMessages: Record<string, string> = {
	incorrect_email_or_password: 'Incorrect e-mail or password.',
	user_with_same_email_exists: 'An account with this e-mail already exists.',
	validation_error: 'Some of the entered data is invalid.',
	activation_token_expired_or_invalid: 'This activation link is invalid or has expired.',
	password_reset_token_expired_or_invalid: 'This password reset link is invalid or has expired.',
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
