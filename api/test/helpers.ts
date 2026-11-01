import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const API_DIR = join(import.meta.dirname, '..');
const STARTUP_TIMEOUT_MS = 30_000;

export interface TestServer {
	baseUrl: string;
	dbPath: string;
	stop(): Promise<void>;
}

export interface TestUser {
	email: string;
	password: string;
	cookie: string;
}

function getFreePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.unref();
		server.on('error', reject);
		server.listen(0, () => {
			const address = server.address();
			const port = typeof address === 'object' && address ? address.port : 0;
			server.close(() => resolve(port));
		});
	});
}

async function waitUntilReady(baseUrl: string, child: ChildProcess, output: () => string): Promise<void> {
	const deadline = Date.now() + STARTUP_TIMEOUT_MS;

	while (Date.now() < deadline) {
		if (child.exitCode !== null) {
			throw new Error(`API exited with code ${child.exitCode} during startup:\n${output()}`);
		}

		try {
			await fetch(`${baseUrl}/auth/user`);
			return;
		} catch {
			await new Promise((resolve) => setTimeout(resolve, 200));
		}
	}

	throw new Error(`API did not start within ${STARTUP_TIMEOUT_MS}ms:\n${output()}`);
}

/**
 * Boots the real API in a child process on a free port against a throwaway SQLite file.
 */
export async function startServer(): Promise<TestServer> {
	const port = await getFreePort();
	const dbPath = join(tmpdir(), `just-todo-it-test-${randomUUID()}.sqlite`);
	const baseUrl = `http://127.0.0.1:${port}`;

	const env: NodeJS.ProcessEnv = {
		...process.env,
		NODE_ENV: 'test',
		HTTP_PORT: String(port),
		DB_PATH: dbPath,
		JWT_SECRET: 'test-secret',
		FRONTEND_URL: 'http://localhost:3000',
		COOKIE_SECURE: 'false',
	};
	delete env.RESEND_API_KEY;

	// `API_TEST_BUILD=1` runs the suite against the tsup build (`pnpm build` first) instead of the sources
	const entry = process.env.API_TEST_BUILD
		? ['dist/index.js']
		: ['--import', '@swc-node/register/esm-register', 'src/index.ts'];
	const child = spawn(process.execPath, entry, {
		cwd: API_DIR,
		env,
		stdio: ['ignore', 'pipe', 'pipe'],
	});

	let output = '';
	child.stdout.on('data', (chunk) => (output += chunk));
	child.stderr.on('data', (chunk) => (output += chunk));

	const stop = async () => {
		if (child.exitCode === null) {
			const exited = new Promise((resolve) => child.once('exit', resolve));
			child.kill('SIGTERM');
			const forceKill = setTimeout(() => child.kill('SIGKILL'), 5_000);
			await exited;
			clearTimeout(forceKill);
		}
		await rm(dbPath, { force: true });
	};

	try {
		await waitUntilReady(baseUrl, child, () => output);
	} catch (error) {
		await stop();
		throw error;
	}

	return { baseUrl, dbPath, stop };
}

function readUserToken(server: TestServer, email: string, column: 'activationToken' | 'passwordResetToken'): string {
	const db = new DatabaseSync(server.dbPath, { readOnly: true });

	try {
		const row = db.prepare(`SELECT ${column} FROM user WHERE email = ?`).get(email) as
			Record<string, string | null> | undefined;

		if (!row?.[column]) {
			throw new Error(`No ${column} found for ${email}`);
		}

		return row[column];
	} finally {
		db.close();
	}
}

/**
 * Reads the activation token straight from the database, standing in for the activation email.
 */
export function readActivationToken(server: TestServer, email: string): string {
	return readUserToken(server, email, 'activationToken');
}

/**
 * Reads the password reset token straight from the database, standing in for the reset email.
 */
export function readPasswordResetToken(server: TestServer, email: string): string {
	return readUserToken(server, email, 'passwordResetToken');
}

export function postJson(server: TestServer, path: string, body: unknown, cookie?: string): Promise<Response> {
	return fetch(`${server.baseUrl}${path}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			...(cookie ? { Cookie: cookie } : {}),
		},
		body: JSON.stringify(body),
	});
}

export function patchJson(server: TestServer, path: string, body: unknown, cookie?: string): Promise<Response> {
	return fetch(`${server.baseUrl}${path}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			...(cookie ? { Cookie: cookie } : {}),
		},
		body: JSON.stringify(body),
	});
}

export function getJson(server: TestServer, path: string, cookie?: string): Promise<Response> {
	return fetch(`${server.baseUrl}${path}`, {
		headers: {
			Accept: 'application/json',
			...(cookie ? { Cookie: cookie } : {}),
		},
	});
}

/**
 * Extracts `name=value` of the given cookie from a response, ready to send back in a `Cookie` header.
 */
export function getCookie(response: Response, name: string): string | undefined {
	return response.headers
		.getSetCookie()
		.map((header) => header.split(';')[0])
		.find((pair) => pair.startsWith(`${name}=`));
}

export function uniqueEmail(): string {
	return `user-${randomUUID()}@example.com`;
}

/**
 * Register → activate (token read from DB) → login. Returns the credentials and the session cookie.
 */
export async function createLoggedInUser(server: TestServer): Promise<TestUser> {
	const email = uniqueEmail();
	const password = 'Correct horse battery staple 1!';

	const registerResponse = await postJson(server, '/auth/register', { email });
	if (!registerResponse.ok) {
		throw new Error(`Register failed: ${registerResponse.status} ${await registerResponse.text()}`);
	}

	const token = readActivationToken(server, email);
	const activateResponse = await postJson(server, '/auth/activate', { token, password });
	if (!activateResponse.ok) {
		throw new Error(`Activate failed: ${activateResponse.status} ${await activateResponse.text()}`);
	}

	const loginResponse = await postJson(server, '/auth/login', { email, password });
	const cookie = getCookie(loginResponse, 'token');
	if (!loginResponse.ok || !cookie) {
		throw new Error(`Login failed: ${loginResponse.status} ${await loginResponse.text()}`);
	}

	return { email, password, cookie };
}
