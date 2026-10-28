import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { after, before, describe, test } from 'node:test';
import {
	createLoggedInUser,
	postJson,
	readActivationToken,
	readPasswordResetToken,
	startServer,
	uniqueEmail,
} from './helpers.ts';
import type { TestServer } from './helpers.ts';

const SENSITIVE_USER_FIELDS = ['passwordHash', 'activationToken', 'passwordResetToken'];
const TEST_JWT_SECRET = 'test-secret';

/** HS256 JWT signed with the test server's secret, for tokens that verify but belong to nobody. */
function signToken(payload: Record<string, unknown>): string {
	const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
	const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
	const signature = createHmac('sha256', TEST_JWT_SECRET).update(`${header}.${body}`).digest('base64url');

	return `${header}.${body}.${signature}`;
}

function tokenForUnknownUser(): string {
	const now = Math.floor(Date.now() / 1000);

	return signToken({ uuid: randomUUID(), email: uniqueEmail(), iat: now, exp: now + 3600 });
}

async function assertSanitizedUser(response: Response, email: string): Promise<void> {
	assert.equal(response.status, 200, await response.clone().text());
	const body = await response.json();

	assert.equal(body.email, email);
	for (const field of SENSITIVE_USER_FIELDS) {
		assert.ok(!(field in body), `response must not contain ${field}`);
	}
}

async function assertCleanClientError(response: Response): Promise<void> {
	assert.ok(response.status >= 400 && response.status < 500, `expected 4xx, got ${response.status}`);
	const body = await response.json();
	assert.equal(typeof body.code, 'string');
}

describe('response shaping', () => {
	let server: TestServer;

	before(async () => {
		server = await startServer();
	});

	after(async () => {
		await server?.stop();
	});

	test('register without a password returns a sanitized user', async () => {
		const email = uniqueEmail();

		await assertSanitizedUser(await postJson(server, '/auth/register', { email }), email);
	});

	test('register with a password returns a sanitized user', async () => {
		const email = uniqueEmail();

		await assertSanitizedUser(await postJson(server, '/auth/register', { email, password: 'hunter22' }), email);
	});

	test('activate returns a sanitized user', async () => {
		const email = uniqueEmail();
		await postJson(server, '/auth/register', { email });
		const token = readActivationToken(server, email);

		await assertSanitizedUser(await postJson(server, '/auth/activate', { token, password: 'Hunter22!' }), email);
	});

	test('login returns a sanitized user', async () => {
		const email = uniqueEmail();
		const password = 'hunter22';
		await postJson(server, '/auth/register', { email, password });

		await assertSanitizedUser(await postJson(server, '/auth/login', { email, password }), email);
	});

	test('reset-password returns a sanitized user', async () => {
		const { email } = await createLoggedInUser(server);
		const requestResponse = await postJson(server, '/auth/request-password-reset', { email });
		assert.equal(requestResponse.status, 204);
		const token = readPasswordResetToken(server, email);

		await assertSanitizedUser(
			await postJson(server, '/auth/reset-password', { token, password: 'New password 1!' }),
			email
		);
	});

	test('create-list does not return the owning user', async () => {
		const user = await createLoggedInUser(server);

		const response = await postJson(
			server,
			'/todo-lists',
			{ title: `List ${randomUUID()}`, todos: [{ title: 'Milk' }] },
			user.cookie
		);
		assert.equal(response.status, 200, await response.clone().text());
		const body = await response.json();

		assert.ok(!('user' in body), 'response must not contain user');
		assert.equal(body.todos.length, 1);
	});

	for (const [name, token] of [
		['a garbage token', 'not-a-jwt'],
		['a valid token for an unknown user', tokenForUnknownUser()],
	]) {
		test(`activate with ${name} is a clean 4xx`, async () => {
			await assertCleanClientError(await postJson(server, '/auth/activate', { token, password: 'Hunter22!' }));
		});

		test(`reset-password with ${name} is a clean 4xx`, async () => {
			await assertCleanClientError(await postJson(server, '/auth/reset-password', { token, password: 'Hunter22!' }));
		});
	}
});
