/**
 * RestoreNamedWindowsUseCase input port
 * Defines the contract for restoring named windows after startup
 */

export interface RestoreNamedWindowsUseCase {
    /**
     * Execute the use case to restore named windows from browser windows
     */
    execute(): Promise<void>;
}

