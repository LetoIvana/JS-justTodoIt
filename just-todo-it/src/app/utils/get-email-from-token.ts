import { jwtDecode } from 'jwt-decode';

interface EmailTokenPayload {
	email?: string;
	exp?: number;
}

/**
 * Reads the email from an activation or password reset token.
 * Returns null when the token is missing, malformed or expired, so the page can show an error instead of the form.
 */
export function getEmailFromToken(token: string | undefined): string | null {
	if (!token) {
		return null;
	}

	try {
		const { email, exp } = jwtDecode<EmailTokenPayload>(token);
		const isExpired = exp !== undefined && exp * 1000 <= Date.now();

		if (isExpired || !email) {
			return null;
		}

		return email;
	} catch {
		return null;
	}
}
