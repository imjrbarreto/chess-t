import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';
import { api } from '../api/axios';

beforeAll(() => {
    // jsdom does not implement the native dialog lifecycle.
    const dialog = HTMLDialogElement.prototype;
    dialog.showModal ??= function () { this.open = true; };
    dialog.close ??= function () { this.open = false; };
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
