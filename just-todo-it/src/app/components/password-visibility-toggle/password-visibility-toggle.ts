import { Component, computed, signal } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

/**
 * Show/hide button for a password field. Place it with `matSuffix` and bind the input's type to `inputType()`
 * through a template reference, e.g. `[type]="passwordToggle.inputType()"`.
 */
@Component({
	imports: [MatIcon, MatIconButton],
	selector: 'jti-password-visibility-toggle',
	templateUrl: './password-visibility-toggle.html',
})
export class PasswordVisibilityToggle {
	protected readonly isVisible = signal(false);
	public readonly inputType = computed(() => (this.isVisible() ? 'text' : 'password'));

	protected toggle(): void {
		this.isVisible.update((isVisible) => !isVisible);
	}
}
