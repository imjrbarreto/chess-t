import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { afterEach, expect, test, vi } from 'vitest';
import App from '../App';
import type { TrainingSessionResponse, WorkspaceRole } from '../api/generated/models';
import { setAccessToken } from '../auth/session';
import { server } from '../test/mocks/server';
import { renderWithProviders } from '../test/renderWithProviders';

const api = import.meta.env.VITE_API_URL;
const path = '/workspaces/1/training-sessions/7';
const responsesUrl = `${api}${path}/responses`;
const own = {
    id: 10, workspace_id: 1, training_session_id: 7, user_id: 1,
    user: { id: 1, name: 'Ana' }, content: 'Mi respuesta',
} satisfies TrainingSessionResponse;
const other = {
    ...own, id: 11, user_id: 2, user: { id: 2, name: 'Luis' }, content: 'Otra respuesta',
} satisfies TrainingSessionResponse;

afterEach(() => setAccessToken(null));

function renderDetail(role: WorkspaceRole, responses: TrainingSessionResponse[] = []) {
    setAccessToken('test-token');
    server.use(
        http.get(`${api}/users/me`, () => HttpResponse.json({
            data: { id: 1, name: 'Ana', email: 'ana@example.com' },
        })),
        http.get(`${api}/workspaces/1`, () => HttpResponse.json({
            data: { id: 1, title: 'Club', status: 'active', role },
        })),
        http.get(`${api}${path}`, () => HttpResponse.json({
            data: { id: 7, user_id: 3, title: 'Finales de torre', category: 'endgame' },
        })),
        http.get(responsesUrl, () => HttpResponse.json({ data: responses })),
    );

    renderWithProviders(<App />, path);
    return userEvent.setup();
}

test('a student submits once and sees other responses after the list refreshes', async () => {
    const user = renderDetail('student');
    const post = vi.fn();
    let sent = false;
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    server.use(
        http.get(responsesUrl, () => HttpResponse.json({ data: sent ? [own, other] : [] })),
        http.post(responsesUrl, async ({ request }) => {
            post(await request.json());
            await pending;
            sent = true;
            return HttpResponse.json({ data: own }, { status: 201 });
        }),
    );

    const input = await screen.findByRole('textbox', { name: 'Tu respuesta' });
    const submit = screen.getByRole('button', { name: 'Enviar respuesta' });
    expect(screen.getByText(/podrás consultar las demás respuestas después de enviar la tuya/i)).toBeVisible();
    expect(screen.queryByText(other.content)).not.toBeInTheDocument();
    expect(submit).toBeDisabled();
    await user.type(input, '   ');
    expect(submit).toBeDisabled();
    expect(post).not.toHaveBeenCalled();
    await user.type(input, own.content);
    try {
        await user.click(submit);
        expect(await screen.findByRole('button', { name: 'Enviando respuesta...' })).toBeDisabled();
    } finally {
        finish();
    }

    expect(await screen.findByText(other.content)).toBeVisible();
    expect(screen.getByText('Luis')).toBeVisible();
    expect(screen.getByText(own.content)).toBeVisible();
    expect(screen.queryByRole('textbox', { name: 'Tu respuesta' })).not.toBeInTheDocument();
    expect(post).toHaveBeenCalledExactlyOnceWith({ content: own.content });
});

test('a student who already answered can read the list and cannot respond again', async () => {
    renderDetail('student', [own, other]);

    expect(await screen.findByText(own.content)).toBeVisible();
    expect(screen.getByText(other.content)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Enviar respuesta' })).not.toBeInTheDocument();
});

test.each(['owner', 'coach', 'viewer'] as const)('%s can read responses but cannot submit', async (role) => {
    renderDetail(role, [other]);

    expect(await screen.findByText(other.content)).toBeVisible();
    expect(screen.getByText('Luis')).toBeVisible();
    expect(screen.queryByRole('textbox', { name: 'Tu respuesta' })).not.toBeInTheDocument();
});

test('shows the list loading state and then the empty state for a viewer', async () => {
    renderDetail('viewer');
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    server.use(http.get(responsesUrl, async () => {
        await pending;
        return HttpResponse.json({ data: [] });
    }));

    try {
        expect(await screen.findByText('Cargando respuestas...')).toHaveAttribute('role', 'status');
    } finally {
        finish();
    }
    expect(await screen.findByText('Todavía no hay respuestas.')).toBeVisible();
});

test.each([
    [403, 'No tienes permiso para ver las respuestas.'],
    [404, 'No se encontraron las respuestas de esta sesión.'],
])('shows a response list error (%i) without offering a form', async (status, message) => {
    renderDetail('student');
    server.use(http.get(responsesUrl, () => new HttpResponse(null, { status })));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByRole('textbox', { name: 'Tu respuesta' })).not.toBeInTheDocument();
});

test.each([
    [403, 'No tienes permiso para enviar una respuesta.'],
    [422, 'El contenido no es válido.'],
])('handles a submission error (%i) and keeps the draft', async (status, message) => {
    const user = renderDetail('student');
    server.use(http.post(responsesUrl, () => HttpResponse.json({
        errors: { content: ['El contenido no es válido.'] },
    }, { status })));

    const input = await screen.findByRole('textbox', { name: 'Tu respuesta' });
    await user.type(input, 'Mi borrador');
    await user.click(screen.getByRole('button', { name: 'Enviar respuesta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(input).toHaveValue('Mi borrador');
});
