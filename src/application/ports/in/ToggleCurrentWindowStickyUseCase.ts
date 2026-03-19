import type { WindowSpecInfo } from './GetCurrentWindowSpecUseCase';

/**
 * Toggle the sticky flag of the specification assigned to the given Firefox window.
 * Returns the updated spec info, or null if the window is not tracked.
 */
export interface ToggleCurrentWindowStickyUseCase {
    execute(firefoxWindowId: number): Promise<WindowSpecInfo | null>;
}
