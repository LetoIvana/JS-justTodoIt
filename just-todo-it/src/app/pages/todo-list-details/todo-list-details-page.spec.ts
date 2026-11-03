import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { TodoListDetailsPage } from './todo-list-details-page';

describe('TodoListDetailsPage', () => {
	let fixture: ComponentFixture<TodoListDetailsPage>;
	let element: HTMLElement;
	let httpTesting: HttpTestingController;

	async function render(uuid: string, respond: (url: string) => void): Promise<void> {
		fixture.componentRef.setInput('uuid', uuid);
		fixture.detectChanges();
		respond(`${environment.apiUrl}/todo-lists/${uuid}`);
		await fixture.whenStable();
	}

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TodoListDetailsPage],
			providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
		}).compileComponents();

		fixture = TestBed.createComponent(TodoListDetailsPage);
		element = fixture.nativeElement;
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => httpTesting.verify());

	it("shows the Todo list's title", async () => {
		await render('1', (url) =>
			httpTesting.expectOne(url).flush({ uuid: '1', title: 'Groceries', created: '2026-01-01T00:00:00.000Z' })
		);

		expect(element.querySelector('h1')?.textContent).toContain('Groceries');
		expect(element.querySelector('[role="alert"]')).toBeNull();
	});

	it("shows a not-found state for a Todo list that doesn't exist or isn't the user's", async () => {
		await render('unknown', (url) => httpTesting.expectOne(url).flush(null, { status: 404, statusText: 'Not Found' }));

		expect(element.querySelector('[role="alert"]')?.textContent).toContain('Todo list not found');
		expect(element.querySelector('a[href="/"]')).not.toBeNull();
	});

	it('shows an error when the Todo list fails to load', async () => {
		await render('1', (url) => httpTesting.expectOne(url).flush(null, { status: 500, statusText: 'Server Error' }));

		expect(element.querySelector('[role="alert"]')?.textContent).toContain('Something went wrong');
		expect(element.querySelector('[role="alert"]')?.textContent).not.toContain('not found');
	});
});
