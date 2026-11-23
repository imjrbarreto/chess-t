import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';
import { api } from '../api/axios';

beforeAll(() => {
    server.listen({ onUnhandledFrame: 'error' });
    api.defaults.adapter = 'fetch';
});

afterEach(() => {
    cleanup();
    server.resetHandlers();
});

afterAll(() => {
    server.close();
});