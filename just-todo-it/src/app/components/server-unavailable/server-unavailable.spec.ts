import { TestBed } from '@angular/core/testing';
import { ServerUnavailable } from './server-unavailable';

describe('ServerUnavailable', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('reloads the page, which loads the user again, when retrying', async () => {
		// jsdom does not let location.reload itself be spied on
		const reloadSpy = vi.fn();
		vi.stubGlobal('location', { ...window.location, reload: reloadSpy });
		const fixture = TestBed.createComponent(ServerUnavailable);
		await fixture.whenStable();

		(fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!.click();

		expect(reloadSpy).toHaveBeenCalled();
	});
});
