import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { afterEach, expect, test } from 'vitest';
import App from '../App';
import type { TrainingSession, WorkspaceRole } from '../api/generated/models';
import { getListTrainingSessionsQueryKey } from '../api/generated/training-sessions/training-sessions';
import { setAccessToken } from '../auth/session';
import { server } from '../test/mocks/server';
import { renderWithProviders } from '../test/renderWithProviders';

const api = import.meta.env.VITE_API_URL;
const ownUrl = `${api}/training-sessions`;
const workspaceUrl = `${api}/workspaces/1`;
const linkedUrl = `${workspaceUrl}/training-sessions`;
const own = { id: 7, user_id: 1, title: 'Finales de torre', category: 'endgame' } satisfies TrainingSession;
const other = { id: 8, user_id: 2, title: 'Plan de ataque', category: 'strategy' } satisfies TrainingSession;
const available = { id: 9, user_id: 1, title: 'Apertura italiana', category: 'opening' } satisfies TrainingSession;

afterEach(() => setAccessToken(null));

function renderWorkspace(role: WorkspaceRole, linked: TrainingSession[] = [own, other], route = '/workspaces/1') {
    setAccessToken('test-token');
    server.use(
        http.get(`${api}/users/me`, () => HttpResponse.json({
            data: { id: 1, name: 'Ana', email: 'ana@example.com' },
        })),
        http.get(workspaceUrl, () => HttpResponse.json({
            data: { id: 1, title: 'Club', status: 'active', role },
        })),
        http.get(linkedUrl, () => HttpResponse.json({ data: linked })),
        http.get(ownUrl, () => HttpResponse.json({ data: [own, available] })),
    );

    return { user: userEvent.setup(), ...renderWithProviders(<App />, route) };
}

test('opens a linked session, shows its workspace detail and returns to the Sessions tab', async () => {
    const { user } = renderWorkspace('viewer');
    const resource = 'https://example.com/finales';
    const sessionPath = `/workspaces/1/training-sessions/${own.id}`;
    let personalRequests = 0;
    server.use(
        http.get(`${api}${sessionPath}`, () => HttpResponse.json({
            data: { ...own, description: 'Practica finales de torre.', resource },
        })),
        http.get(`${ownUrl}/:id`, () => {
            personalRequests++;
            return new HttpResponse(null, { status: 403 });
        }),
    );

    await user.click(await screen.findByRole('tab', { name: 'Sesiones' }));
    const titleLink = await screen.findByRole('link', { name: own.title });
    expect(titleLink).toHaveAttribute('href', sessionPath);
    await user.click(titleLink);

    expect(await screen.findByRole('heading', { name: own.title })).toBeInTheDocument();
    expect(screen.getByText('Finales')).toBeInTheDocument();
    expect(screen.getByText('Practica finales de torre.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: resource })).toHaveAttribute('href', resource);
    expect(personalRequests).toBe(0);

    await user.click(screen.getByRole('link', { name: 'Volver a sesiones del workspace' }));
    expect(await screen.findByRole('tab', { name: 'Sesiones', selected: true })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: own.title })).toBeInTheDocument();
});

test('shows loading on direct navigation and handles an absent description and resource', async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    renderWorkspace('viewer', [], '/workspaces/1/training-sessions/7');
    server.use(http.get(`${linkedUrl}/7`, async () => {
        await pending;
        return HttpResponse.json({ data: own });
    }));

    try {
        expect(await screen.findByText('Cargando sesión...')).toHaveAttribute('role', 'status');
    } finally {
        finish();
    }

    expect(await screen.findByRole('heading', { name: own.title })).toBeInTheDocument();
    expect(screen.getByText('Sin descripción')).toBeInTheDocument();
    expect(screen.getByText('Sin recurso')).toBeInTheDocument();
});

test.each([
    [403, 'No tienes permiso para ver esta sesión en el workspace.'],
    [404, 'No se encontró la sesión en este workspace.'],
    [500, 'No se pudo cargar la sesión.'],
])('shows a workspace session error (%i) and keeps the return link', async (status, message) => {
    renderWorkspace('viewer', [], '/workspaces/1/training-sessions/7');
    server.use(http.get(`${linkedUrl}/7`, () => new HttpResponse(null, { status })));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('link', { name: 'Volver a sesiones del workspace' }))
        .toHaveAttribute('href', '/workspaces/1?tab=sessions');
});

test('reaches the third tab by keyboard and lists linked sessions with their categories', async () => {
    const { user } = renderWorkspace('owner');
    const general = await screen.findByRole('tab', { name: 'General', selected: true });
    general.focus();
    await user.keyboard('{ArrowRight}{ArrowRight}{Enter}');

    const tab = screen.getByRole('tab', { name: 'Sesiones', selected: true });
    expect(tab).toHaveFocus();
    const panel = screen.getByRole('tabpanel', { name: 'Sesiones' });
    const rows = await within(panel).findAllByRole('listitem');
    expect(rows[0]).toHaveTextContent(/Finales de torre.*Finales/);
    expect(rows[1]).toHaveTextContent(/Plan de ataque.*Estrategia/);
    expect(within(rows[1]).getByRole('button', { name: 'Desvincular Plan de ataque' })).toBeEnabled();
    await user.keyboard('{ArrowRight}');
    expect(general).toHaveFocus();
});

test.each(['owner', 'coach'] as const)('links an available own session as %s and refreshes both the list and picker', async (role) => {
    const sessions: TrainingSession[] = [own, other];
    const { user } = renderWorkspace(role, sessions);
    let body: unknown;
    server.use(
        http.get(ownUrl, () => HttpResponse.json({ data: [own, available, { ...other, id: 10 }] })),
        http.post(linkedUrl, async ({ request }) => {
            body = await request.json();
            sessions.push(available);
            return new HttpResponse(null, { status: 204 });
        }),
    );

    await user.click(await screen.findByRole('tab', { name: 'Sesiones' }));
    const picker = await screen.findByLabelText('Sesión propia');
    expect(within(picker).queryByRole('option', { name: own.title })).not.toBeInTheDocument();
    expect(within(picker).queryByRole('option', { name: other.title })).not.toBeInTheDocument();
    await user.selectOptions(picker, String(available.id));
    await user.click(screen.getByRole('button', { name: 'Vincular sesión' }));

    const list = screen.getByRole('list');
    expect(await within(list).findByText(available.title)).toBeInTheDocument();
    expect(await screen.findByText('No tienes sesiones propias disponibles para vincular.')).toBeInTheDocument();
    expect(body).toEqual({ training_session_id: available.id });
});

test('lets coaches unlink their own sessions after confirmation without deleting the original', async () => {
    const sessions = [own, other];
    const { user, queryClient } = renderWorkspace('coach', sessions);
    let unlinked = 0;
    let deleted = 0;
    server.use(
        http.delete(`${linkedUrl}/${own.id}`, () => {
            unlinked++;
            sessions.shift();
            return new HttpResponse(null, { status: 204 });
        }),
        http.delete(`${ownUrl}/${own.id}`, () => {
            deleted++;
            return new HttpResponse(null, { status: 204 });
        }),
    );

    await user.click(await screen.findByRole('tab', { name: 'Sesiones' }));
    const unlink = await screen.findByRole('button', { name: `Desvincular ${own.title}` });
    expect(screen.queryByRole('button', { name: `Desvincular ${other.title}` })).not.toBeInTheDocument();
    await user.click(unlink);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(unlinked).toBe(0);
    await user.click(unlink);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar desvinculación' }));

    const list = screen.getByRole('list');
    await waitFor(() => expect(within(list).queryByText(own.title)).not.toBeInTheDocument());
    const picker = await screen.findByLabelText('Sesión propia');
    expect(within(picker).getByRole('option', { name: own.title })).toBeInTheDocument();
    expect(unlinked).toBe(1);
    expect(deleted).toBe(0);
    expect(queryClient.getQueryData(getListTrainingSessionsQueryKey())).toEqual({ data: [own, available] });
});

test.each(['student', 'viewer'] as const)('gives %s read-only access without fetching their own sessions', async (role) => {
    const { user } = renderWorkspace(role);
    let ownRequests = 0;
    server.use(http.get(ownUrl, () => {
        ownRequests++;
        return HttpResponse.json({ data: [own] });
    }));
    await user.click(await screen.findByRole('tab', { name: 'Sesiones' }));

    expect(await screen.findByText(own.title)).toBeInTheDocument();
    expect(screen.queryByLabelText('Sesión propia')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Desvincular/ })).not.toBeInTheDocument();
    expect(ownRequests).toBe(0);
});

test('shows loading and an empty linked list', async () => {
    const { user } = renderWorkspace('viewer');
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    server.use(http.get(linkedUrl, async () => {
        await pending;
        return HttpResponse.json({ data: [] });
    }));
    try {
        await user.click(await screen.findByRole('tab', { name: 'Sesiones' }));
        expect(screen.getByRole('status')).toHaveTextContent('Cargando sesiones vinculadas...');
    } finally {
        finish();
    }

    expect(await screen.findByText('No hay sesiones vinculadas a este workspace.')).toBeInTheDocument();
});

test.each([
    [403, 'No tienes permiso para ver las sesiones vinculadas.'],
    [500, 'No se pudieron cargar las sesiones vinculadas.'],
])('shows an error when linked sessions cannot be loaded (%i)', async (status, message) => {
    const { user } = renderWorkspace('owner');
    server.use(http.get(linkedUrl, () => new HttpResponse(null, { status })));
    await user.click(await screen.findByRole('tab', { name: 'Sesiones' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByRole('button', { name: 'Vincular sesión' })).not.toBeInTheDocument();
});

test('keeps the list usable if own sessions fail to load', async () => {
    const { user } = renderWorkspace('owner');
    server.use(http.get(ownUrl, () => new HttpResponse(null, { status: 500 })));
    await user.click(await screen.findByRole('tab', { name: 'Sesiones' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar tus sesiones propias.');
    expect(await screen.findByRole('button', { name: `Desvincular ${other.title}` })).toBeEnabled();
});

test('shows API permission errors for both link and unlink mutations', async () => {
    const { user } = renderWorkspace('owner');
    server.use(
        http.post(linkedUrl, () => new HttpResponse(null, { status: 403 })),
        http.delete(`${linkedUrl}/${other.id}`, () => new HttpResponse(null, { status: 403 })),
    );
    await user.click(await screen.findByRole('tab', { name: 'Sesiones' }));
    const picker = await screen.findByLabelText('Sesión propia');
    await user.selectOptions(picker, String(available.id));
    await user.click(screen.getByRole('button', { name: 'Vincular sesión' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes permiso para vincular esta sesión.');
    expect(picker).toHaveValue(String(available.id));

    await user.click(screen.getByRole('button', { name: `Desvincular ${other.title}` }));
    const dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: 'Confirmar desvinculación' }));

    expect(await dialog.findByRole('alert')).toHaveTextContent('No tienes permiso para desvincular esta sesión.');
    expect(within(screen.getByRole('list')).getByText(other.title)).toBeInTheDocument();
});
