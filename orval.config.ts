import { defineConfig } from 'orval';

export default defineConfig({
    elometrics: {
        input: './api-docs.json',
        output: {
            mode: 'tags-split',
            target: './src/api/generated/endpoints.ts',
            schemas: './src/api/generated/models',
            client: 'react-query',
            httpClient: 'axios',
        },
    },
});