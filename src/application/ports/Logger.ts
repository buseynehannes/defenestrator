export interface Logger {
    log(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}
