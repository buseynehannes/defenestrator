import * as http from 'http';
import type { AddressInfo } from 'net';
import type { IncomingMessage, ServerResponse } from 'http';

export interface TestServer {
    readonly port: number;
    close(): Promise<void>;
}

/**
 * Starts a minimal local HTTP server that serves a static HTML page for any path.
 * The page title reflects the request path so the extension can match URL patterns
 * against paths like `/email` or `/work` without needing real internet access.
 */
export function startTestServer(): Promise<TestServer> {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
            const page = `<html lang="en"><head><title>Test: ${req.url}</title></head><body>Integration test page: ${req.url}</body></html>`;
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(page);
        });

        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address() as AddressInfo;
            resolve({
                port,
                close: () =>
                    new Promise<void>((res, rej) =>
                        server.close((err?: Error) => (err ? rej(err) : res()))
                    ),
            });
        });
    });
}
