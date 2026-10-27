// Builds an unsigned JWT with the given payload; the app only decodes tokens, so no signature is needed
export function createTestToken(payload: object): string {
	const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');

	return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

export function createValidTestToken(email: string): string {
	return createTestToken({ email, exp: Math.floor(Date.now() / 1000) + 60 * 60 });
}
