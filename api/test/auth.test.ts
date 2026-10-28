import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import {
	createLoggedInUser,
	getCookie,
	postJson,
	readActivationToken,
	readPasswordResetToken,
	startServer,
	uniqueEmail,
} from './helpers.ts';
import type { TestServer } from './helpers.ts';

describe('auth', () => {
	let server: TestServer;

	before(async () => {
		server = await startServer();
	});

	after(async () => {
		await server?.stop();
	});

	test('a registered user can activate their account and log in', async () => {
		const email = uniqueEmail();
		const password = 'Correct horse battery staple 1!';

		const registerResponse = await postJson(server, '/auth/register', { email });
		assert.equal(registerResponse.status, 200);

		const token = readActivationToken(server, email);
		const activateResponse = await postJson(server, '/auth/activate', { token, password });
		assert.equal(activateResponse.status, 200);

		const loginResponse = await postJson(server, '/auth/login', { email, password });
		assert.equal(loginResponse.status, 200);
		assert.ok(getCookie(loginResponse, 'token'), 'login sets a token cookie');
	});

	describe('register, activate and reset-password reject a password that breaks the rules', () => {
		const weakPasswords = [
			['is shorter than 8 characters', 'Abc12!'],
			['has no uppercase letter', 'password1!'],
			['has no lowercase letter', 'PASSWORD1!'],
			['has no digit', 'Password!'],
			['has no special character', 'Password1'],
		];

		for (const [rule, password] of weakPasswords) {
			test(`register rejects a password that ${rule}`, async () => {
				const response = await postJson(server, '/auth/register', { email: uniqueEmail(), password });
				assert.equal(response.status, 400);
				assert.equal(((await response.json()) as { code: string }).code, 'validation_error');
			});

			test(`activate rejects a password that ${rule}`, async () => {
				const email = uniqueEmail();
				await postJson(server, '/auth/register', { email });
				const token = readActivationToken(server, email);

				const response = await postJson(server, '/auth/activate', { token, password });
				assert.equal(response.status, 400);
				assert.equal(((await response.json()) as { code: string }).code, 'validation_error');
			});

			test(`reset-password rejects a password that ${rule}`, async () => {
				const { email } = await createLoggedInUser(server);
				await postJson(server, '/auth/request-password-reset', { email });
				const token = readPasswordResetToken(server, email);

				const response = await postJson(server, '/auth/reset-password', { token, password });
				assert.equal(response.status, 400);
				assert.equal(((await response.json()) as { code: string }).code, 'validation_error');
			});
		}
	});
});
