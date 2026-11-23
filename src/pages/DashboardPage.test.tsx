import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { Link, useLocation } from 'react-router';
import { afterEach, expect, test, vi } from 'vitest';
import App from '../App';
import { getGetCurrentUserQueryKey } from '../api/generated/authentication/authentication';
import { getHealthCheckQueryKey } from '../api/generated/health/health';
import { getGetWorkspaceQueryKey, getListWorkspacesQueryKey } from '../api/generated/workspaces/workspaces';
import { setAccessToken } from '../auth/session';
import { server } from '../test/mocks/server';
import { renderWithProviders } from '../test/renderWithProviders';

const apiUrl = import.meta.env.VITE_API_URL;

afterEach(() => setAccessToken(null));

function RouterProbe() {
    const { pathname } = useLocation();

    return (
        <>
            <output aria-label="Ruta actual">{pathname}</output>
            <Link to="/dashboard">Volver al Dashboard</Link>
        </>
    );
}

function renderDashboard() {
    setAccessToken('passport-token');
    server.use(http.get(`${apiUrl}/users/me`, () => HttpResponse.json({
        data: { id: 1, name: 'Test User', email: 'test@example.com' },
    })));

    return renderWithProviders(
        <>
            <App />
            <RouterProbe />
        </>,
        '/dashboard',
    );
}

test('revokes the Bearer token, cancels private requests and protects the dashboard after logout', async () => {
    let authorization: string | null = null;
    let finishLogout!: () => void;
    const pendingLogout = new Promise<void>((resolve) => { finishLogout = resolve; });

    server.use(http.post(`${apiUrl}/logout`, async ({ request }) => {
        authorization = request.headers.get('Authorization');
        await pendingLogout;
        return new HttpResponse(null, { status: 204 });
    }));

    const user = userEvent.setup();
    const { queryClient } = renderDashboard();
    const logout = await screen.findByRole('button', { name: 'Cerrar sesión' });
    const privateKey = getListWorkspacesQueryKey();
    const pendingKey = getGetWorkspaceQueryKey(1);
    const publicKey = getHealthCheckQueryKey();
    const abort = vi.fn();

    queryClient.setQueryData(privateKey, { data: [{ id: 1 }] });
    queryClient.setQueryData(publicKey, { status: 'ok' });
    const pendingQuery = queryClient.fetchQuery({
        queryKey: pendingKey,
        queryFn: ({ signal }) => new Promise(() => {
            signal.addEventListener('abort', abort, { once: true });
        }),
    }).catch(() => undefined);

    try {
        await user.click(logout);
        expect(screen.getByRole('button', { name: 'Cerrando sesión…' })).toBeDisabled();
        expect(sessionStorage.getItem('elometrics.accessToken')).toBe('passport-token');
    } finally {
        finishLogout();
    }

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(authorization).toBe('Bearer passport-token');
    expect(sessionStorage.getItem('elometrics.accessToken')).toBeNull();
    expect(abort).toHaveBeenCalledOnce();
    expect(queryClient.getQueryState(pendingKey)).toBeUndefined();
    expect(queryClient.getQueryState(privateKey)).toBeUndefined();
    expect(queryClient.getQueriesData({ queryKey: getGetCurrentUserQueryKey() })
        .every(([, data]) => data === undefined)).toBe(true);
    expect(queryClient.getQueryData(publicKey)).toEqual({ status: 'ok' });
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent(/^\/login$/);
    await pendingQuery;

    await user.click(screen.getByRole('link', { name: 'Volver al Dashboard' }));
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent(/^\/login$/);
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument();
});

test('keeps the session after a network error and allows retrying logout', async () => {
    server.use(http.post(`${apiUrl}/logout`, () => HttpResponse.error()));

    const user = userEvent.setup();
    const { queryClient } = renderDashboard();
    const logout = await screen.findByRole('button', { name: 'Cerrar sesión' });
    const privateKey = getListWorkspacesQueryKey();
    queryClient.setQueryData(privateKey, { data: [] });

    await user.click(logout);

    expect(await screen.findByRole('alert')).toHaveTextContent(
        'No se pudo cerrar la sesión. Inténtalo de nuevo.',
    );
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent(/^\/dashboard$/);
    expect(sessionStorage.getItem('elometrics.accessToken')).toBe('passport-token');
    expect(queryClient.getQueryData(privateKey)).toEqual({ data: [] });
    expect(logout).toBeEnabled();

    server.use(http.post(`${apiUrl}/logout`, () => new HttpResponse(null, { status: 204 })));
    await user.click(logout);

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(sessionStorage.getItem('elometrics.accessToken')).toBeNull();
});

test('cleans up the session when logout reports an already invalid token', async () => {
    server.use(http.post(`${apiUrl}/logout`, () => new HttpResponse(null, { status: 401 })));

    const user = userEvent.setup();
    const { queryClient } = renderDashboard();
    const logout = await screen.findByRole('button', { name: 'Cerrar sesión' });
    const privateKey = getListWorkspacesQueryKey();
    queryClient.setQueryData(privateKey, { data: [] });

    await user.click(logout);

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(sessionStorage.getItem('elometrics.accessToken')).toBeNull();
    expect(queryClient.getQueryData(privateKey)).toBeUndefined();

    server.use(http.post(`${apiUrl}/login`, () => HttpResponse.json({
        data: { id: 1, name: 'Test User', email: 'test@example.com' },
        token: { token_type: 'Bearer', access_token: 'new-passport-token' },
    })));
    await user.type(screen.getByLabelText('Correo electrónico'), 'test@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
