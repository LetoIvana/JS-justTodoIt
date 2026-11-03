import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
	MAT_DIALOG_DATA,
	MatDialogActions,
	MatDialogClose,
	MatDialogContent,
	MatDialogTitle,
} from '@angular/material/dialog';

export interface ConfirmDialogData {
	title: string;
	message: string;
	confirmLabel: string;
}

/**
 * Closes with `true` when confirmed, `false` when cancelled, and nothing when dismissed (Escape or backdrop click).
 */
@Component({
	imports: [MatButton, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle],
	selector: 'jti-confirm-dialog',
	templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
	protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
