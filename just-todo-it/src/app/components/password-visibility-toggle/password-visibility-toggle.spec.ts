import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PasswordVisibilityToggle } from './password-visibility-toggle';

describe('PasswordVisibilityToggle', () => {
	let fixture: ComponentFixture<PasswordVisibilityToggle>;
	let button: HTMLButtonElement;

	beforeEach(async () => {
		await TestBed.configureTestingModule({ imports: [PasswordVisibilityToggle] }).compileComponents();

		fixture = TestBed.createComponent(PasswordVisibilityToggle);
		button = fixture.nativeElement.querySelector('button');
		await fixture.whenStable();
	});

	it('starts with the password hidden', () => {
		expect(fixture.componentInstance.inputType()).toBe('password');
		expect(button.getAttribute('aria-label')).toBe('Show password');
		expect(button.textContent).toContain('visibility');
	});

	it('shows the password on click and hides it again on a second click', () => {
		button.click();
		fixture.detectChanges();

		expect(fixture.componentInstance.inputType()).toBe('text');
		expect(button.getAttribute('aria-label')).toBe('Hide password');
		expect(button.textContent).toContain('visibility_off');

		button.click();
		fixture.detectChanges();

		expect(fixture.componentInstance.inputType()).toBe('password');
		expect(button.getAttribute('aria-label')).toBe('Show password');
	});
});
