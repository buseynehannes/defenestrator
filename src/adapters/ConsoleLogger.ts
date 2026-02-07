import type { Logger } from "../ports/Logger.js";

export class ConsoleLogger implements Logger {
    log(message: string, ...args: unknown[]): void {
        console.log(message, ...args);
    }

    error(message: string, ...args: unknown[]): void {
        console.error(message, ...args);
    }
}
