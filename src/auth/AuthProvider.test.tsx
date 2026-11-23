import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { afterEach, expect, test } from 'vitest';
import App from '../App';
import { setAccessToken } from './session';
import { server } from '../test/mocks/server';
import { renderWithProviders } from '../test/renderWithProviders';
import {  getListWorkspacesQueryKey, } from '../api/generated/workspaces/workspaces';

const apiUrl = import.meta.env.VITE_API_URL;

const authenticatedUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
};

afterEach(() => {
    setAccessToken(null);
});

function renderProtectedPage() {
    return renderWithProviders(<App />, '/dashboard');
}

test('redirects unauthenticated users to login', async () => {
    renderProtectedPage();

    expect(
        await screen.findByRole('heading', { name: 'Iniciar sesión' })
    ).toBeInTheDocument();
});

test('restores an existing authenticated session', async () => {
    setAccessToken('test-token');

    server.use(
        http.get(`${apiUrl}/users/me`, () => {
            return HttpResponse.json({
                data: authenticatedUser,
            });
        }),
    );

    renderProtectedPage();

    expect(
        await screen.findByRole('heading', { name: 'Dashboard' })
    ).toBeInTheDocument();
});

test('does not display private content while checking the session', async () => {
    setAccessToken('test-token');

    let finishRequest!: () => void;

    const pendingRequest = new Promise<void>((resolve) => {
        finishRequest = resolve;
    });

    server.use(
        http.get(`${apiUrl}/users/me`, async () => {
            await pendingRequest;

            return HttpResponse.json({
                data: authenticatedUser,
            });
        }),
    );

    renderProtectedPage();

    try {
        expect(
            screen.queryByRole('heading', { name: 'Dashboard' })
        ).not.toBeInTheDocument();
    } finally {
        finishRequest();
    }

    expect(
        await screen.findByRole('heading', { name: 'Dashboard' })
    ).toBeInTheDocument();
});

test('clears the session when the API rejects the token', async () => {
    setAccessToken('test-token');

    server.use(
        http.get(`${apiUrl}/users/me`, () => {
            return new HttpResponse(null, { status: 401 });
        }),
    );

    renderProtectedPage();

    expect(
        await screen.findByRole('heading', { name: 'Iniciar sesión' })
    ).toBeInTheDocument();

    expect(
        sessionStorage.getItem('elometrics.accessToken')
    ).toBeNull();
});

test('preserves the session after a network error and allows retrying', async () => {
    setAccessToken('test-token');

    server.use(
        http.get(`${apiUrl}/users/me`, () => HttpResponse.error()),
    );

    const user = userEvent.setup();

    renderProtectedPage();

    const retryButton = await screen.findByRole('button', {
        name: /reintentar/i,
    });

    expect(
        sessionStorage.getItem('elometrics.accessToken')
    ).toBe('test-token');

    expect(
        screen.queryByRole('heading', { name: 'Dashboard' })
    ).not.toBeInTheDocument();

    server.use(
        http.get(`${apiUrl}/users/me`, () => {
            return HttpResponse.json({
                data: authenticatedUser,
            });
        }),
    );

    await user.click(retryButton);

    expect(
        await screen.findByRole('heading', { name: 'Dashboard' })
    ).toBeInTheDocument();
});

test('clears private cached data when the session changes', async () => {
    setAccessToken('first-token');

    server.use(
        http.get(`${apiUrl}/users/me`, () => {
            return HttpResponse.json({
                data: authenticatedUser,
            });
        }),
    );

    const { queryClient } = renderProtectedPage();

    await screen.findByRole('heading', { name: 'Dashboard' });

    const privateKey = getListWorkspacesQueryKey();

    queryClient.setQueryData(privateKey, {
        data: [{ id: 1 }],
    });

    act(() => {
        setAccessToken('second-token');
    });

    expect(
        queryClient.getQueryData(privateKey)
    ).toBeUndefined();

    await screen.findByRole('heading', { name: 'Dashboard' });
});