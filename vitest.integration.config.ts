import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/integration/**/*.test.ts'],
        // Browser launches and page loads are slow — give each test and hook plenty of time
        testTimeout: 60_000,
        hookTimeout: 60_000,
        // Run integration tests in a single fork so the browser session is shared
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true,
            },
        },
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
});
