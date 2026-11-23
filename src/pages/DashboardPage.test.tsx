import { screen, within } from '@testing-library/react';
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

    queryClient.setQueryData(privateKey, {
        data: [{ id: 1, title: 'Road to GM', status: 'active', role: 'owner' }],
    });
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

test('displays statistics for all data and lists up to five accessible workspaces', async () => {
    server.use(
        http.get(`${apiUrl}/workspaces`, () => {
            return HttpResponse.json({
                data: [
                    { id: 1, title: 'Road to GM', status: 'active', role: 'owner' },
                    { id: 2, title: 'Advanced Group', status: 'active', role: 'coach' },
                    { id: 3, title: 'Beginners', status: 'paused', role: 'owner' },
                    { id: 4, title: 'Openings', status: 'archived', role: 'student' },
                    { id: 5, title: 'Endgames', status: 'paused', role: 'viewer' },
                    { id: 6, title: 'Tactics', status: 'active', role: 'coach' },
                ],
            });
        }),

        http.get(`${apiUrl}/training-sessions`, () => {
            return HttpResponse.json({
                data: [
                    { id: 1, user_id: 1, title: 'Calculation', category: 'tactics' },
                ],
            });
        }),
    );

    renderDashboard();

    expect(await screen.findByText('Bienvenido, Test User'))
        .toBeInTheDocument();

    expect(screen.getByText('Workspaces').parentElement)
        .toHaveTextContent('6');

    expect(screen.getByText('Workspaces activos').parentElement)
        .toHaveTextContent('3');

    expect(screen.getByText('Sesiones propias').parentElement)
        .toHaveTextContent('1');

    const section = screen.getByRole('region', { name: 'Workspaces accesibles' });
    const rows = within(section).getAllByRole('listitem');
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveTextContent(/Road to GM.*Activo.*Propietario/);
    expect(rows[1]).toHaveTextContent(/Advanced Group.*Activo.*Entrenador/);
    expect(rows[2]).toHaveTextContent(/Beginners.*Pausado.*Propietario/);
    expect(rows[3]).toHaveTextContent(/Openings.*Archivado.*Estudiante/);
    expect(rows[4]).toHaveTextContent(/Endgames.*Pausado.*Observador/);
    expect(within(section).queryByText('Tactics')).not.toBeInTheDocument();
});

test('displays zero statistics when no data exists', async () => {
    renderDashboard();

    await screen.findByText('Bienvenido, Test User');

    expect(screen.getByText('Workspaces').parentElement)
        .toHaveTextContent('0');

    expect(screen.getByText('Workspaces activos').parentElement)
        .toHaveTextContent('0');

    expect(screen.getByText('Sesiones propias').parentElement)
        .toHaveTextContent('0');

    const section = screen.getByRole('region', { name: 'Workspaces accesibles' });
    expect(within(section).getByText('Todavía no tienes acceso a ningún workspace.'))
        .toBeInTheDocument();
    expect(within(section).queryByRole('list')).not.toBeInTheDocument();
});

test('displays an error when dashboard data cannot be loaded', async () => {
    server.use(
        http.get(`${apiUrl}/workspaces`, () => {
            return new HttpResponse(null, { status: 500 });
        }),
    );

    renderDashboard();

    expect(await screen.findByRole('alert'))
        .toHaveTextContent('No se pudo cargar el dashboard.');
});

test('displays a loading state while fetching dashboard data', async () => {
    let finishRequest!: () => void;

    const pendingRequest = new Promise<void>((resolve) => {
        finishRequest = resolve;
    });

    server.use(
        http.get(`${apiUrl}/workspaces`, async () => {
            await pendingRequest;

            return HttpResponse.json({ data: [] });
        }),
    );

    renderDashboard();

    try {
        expect(
            await screen.findByText('Cargando dashboard...')
        ).toBeInTheDocument();
    } finally {
        finishRequest();
    }

    expect(
        await screen.findByText('Bienvenido, Test User')
    ).toBeInTheDocument();
});
