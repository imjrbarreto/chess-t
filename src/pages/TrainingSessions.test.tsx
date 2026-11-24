import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { afterEach, expect, test } from 'vitest';
import App from '../App';
import type { TrainingSession } from '../api/generated/models';
import {
    getGetTrainingSessionQueryKey,
    getListTrainingSessionsQueryKey,
} from '../api/generated/training-sessions/training-sessions';
import { setAccessToken } from '../auth/session';
import { server } from '../test/mocks/server';
import { renderWithProviders } from '../test/renderWithProviders';

const api = import.meta.env.VITE_API_URL;
const sessionsUrl = `${api}/training-sessions`;
const session = {
    id: 7,
    user_id: 1,
    title: 'Finales de torre',
    category: 'endgame',
    description: 'Practicar posiciones de Lucena.',
    resource: 'https://example.com/finales',
} satisfies TrainingSession;

afterEach(() => setAccessToken(null));

function renderPage(path = '/training-sessions') {
    setAccessToken('test-token');
    server.use(
        http.get(`${api}/users/me`, () => HttpResponse.json({
            data: { id: 1, name: 'Ana', email: 'ana@example.com' },
        })),
        http.get(sessionsUrl, () => HttpResponse.json({ data: [session] })),
        http.get(`${sessionsUrl}/7`, () => HttpResponse.json({ data: session })),
    );

    return { user: userEvent.setup(), ...renderWithProviders(<App />, path) };
}

test('opens own sessions from the sidebar and navigates to the detail', async () => {
    const { user } = renderPage('/dashboard');
    const sidebar = await screen.findByRole('navigation', { name: 'Navegación principal' });
    const link = within(sidebar).getByRole('link', { name: 'Sesiones de entrenamiento' });
    await user.click(link);
    expect(link).toHaveAttribute('aria-current', 'page');
    const cardLink = await screen.findByRole('link', { name: session.title });
    expect(cardLink.closest('h2')?.parentElement).toHaveTextContent('Finales');

    await user.click(cardLink);
    expect(await screen.findByRole('heading', { name: session.title, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(session.description)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: session.resource })).toHaveAttribute('href', session.resource);
    expect(link).toHaveAttribute('aria-current', 'page');
});

test('shows loading and an empty session list', async () => {
    let finishRequest!: () => void;
    const pending = new Promise<void>((resolve) => { finishRequest = resolve; });
    renderPage();
    server.use(http.get(sessionsUrl, async () => {
        await pending;
        return HttpResponse.json({ data: [] });
    }));

    try {
        expect(await screen.findByText('Cargando sesiones...')).toBeInTheDocument();
    } finally {
        finishRequest();
    }

    expect(await screen.findByText('Todavía no tienes sesiones de entrenamiento.')).toBeInTheDocument();
});

test('shows a session list error and a forbidden detail error', async () => {
    const { user } = renderPage('/training-sessions/7');
    server.use(
        http.get(`${sessionsUrl}/7`, () => new HttpResponse(null, { status: 403 })),
        http.get(sessionsUrl, () => new HttpResponse(null, { status: 500 })),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes permiso para ver esta sesión.');
    await user.click(screen.getByRole('link', { name: 'Volver a sesiones' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar las sesiones.');
});

test('creates a session using the OpenAPI categories and refreshes the list', async () => {
    const { user } = renderPage();
    const sessions: TrainingSession[] = [session];
    let submitted: unknown;
    server.use(
        http.get(sessionsUrl, () => HttpResponse.json({ data: sessions })),
        http.post(sessionsUrl, async ({ request }) => {
            submitted = await request.json();
            const created = { ...session, ...submitted as Partial<TrainingSession>, id: 8 };
            sessions.push(created);
            return HttpResponse.json({ data: created }, { status: 201 });
        }),
    );

    await user.click(await screen.findByRole('button', { name: 'Crear sesión' }));
    const category = screen.getByLabelText('Categoría');
    expect(within(category).getAllByRole('option').slice(1).map((option) => option.getAttribute('value')))
        .toEqual(['opening', 'middlegame', 'endgame', 'tactics', 'strategy']);
    await user.type(screen.getByLabelText('Título'), 'Apertura italiana');
    await user.selectOptions(category, 'opening');
    await user.type(screen.getByLabelText('Descripción'), 'Revisar la línea principal.');
    await user.type(screen.getByLabelText('Recurso'), 'https://example.com/italiana');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByRole('link', { name: 'Apertura italiana' })).toBeInTheDocument();
    expect(submitted).toEqual({
        title: 'Apertura italiana',
        category: 'opening',
        description: 'Revisar la línea principal.',
        resource: 'https://example.com/italiana',
    });
});

test('validates required fields and displays server field errors without losing the form', async () => {
    const { user } = renderPage();
    let requests = 0;
    server.use(http.post(sessionsUrl, () => {
        requests++;
        return HttpResponse.json({
            message: 'Validation failed.',
            errors: { resource: ['El recurso no es válido.'] },
        }, { status: 422 });
    }));

    await user.click(await screen.findByRole('button', { name: 'Crear sesión' }));
    const title = screen.getByLabelText('Título');
    const resource = screen.getByLabelText('Recurso');
    const submit = screen.getByRole('button', { name: 'Guardar' });
    expect(title).toBeRequired();
    expect(screen.getByLabelText('Categoría')).toBeRequired();
    await user.click(submit);
    expect(requests).toBe(0);
    await user.type(title, 'Táctica');
    await user.selectOptions(screen.getByLabelText('Categoría'), 'tactics');
    await user.type(resource, 'no-es-url');
    await user.click(submit);
    expect(resource).toBeInvalid();
    expect(requests).toBe(0);
    await user.clear(resource);
    await user.type(resource, 'https://example.com');
    await user.click(submit);

    expect(await screen.findByText('El recurso no es válido.')).toBeInTheDocument();
    expect(resource).toHaveAccessibleDescription('El recurso no es válido.');
    expect(title).toHaveValue('Táctica');
    expect(requests).toBe(1);
});

test('updates the session and clears optional fields in both detail and list cache', async () => {
    const { user, queryClient } = renderPage('/training-sessions/7');
    let stored: TrainingSession = session;
    let submitted: unknown;
    queryClient.setQueryData(getListTrainingSessionsQueryKey(), { data: [session] });
    server.use(
        http.get(`${sessionsUrl}/7`, () => HttpResponse.json({ data: stored })),
        http.get(sessionsUrl, () => HttpResponse.json({ data: [stored] })),
        http.patch(`${sessionsUrl}/7`, async ({ request }) => {
            submitted = await request.json();
            stored = { ...stored, ...submitted as Partial<TrainingSession> };
            return HttpResponse.json({ data: stored });
        }),
    );

    await user.click(await screen.findByRole('button', { name: 'Editar sesión' }));
    const title = screen.getByLabelText('Título');
    expect(title).toHaveValue(session.title);
    await user.clear(title);
    await user.type(title, 'Finales prácticos');
    await user.clear(screen.getByLabelText('Descripción'));
    await user.clear(screen.getByLabelText('Recurso'));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByRole('heading', { name: 'Finales prácticos', level: 1 })).toBeInTheDocument();
    expect(submitted).toEqual({ title: 'Finales prácticos', category: 'endgame', description: null, resource: null });
    expect(screen.queryByText(session.description)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: session.resource })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Volver a sesiones' }));
    expect(await screen.findByRole('link', { name: 'Finales prácticos' })).toBeInTheDocument();
});

test('confirms before deleting and removes the detail from the cache', async () => {
    const { user, queryClient } = renderPage('/training-sessions/7');
    let requests = 0;
    server.use(
        http.get(sessionsUrl, () => HttpResponse.json({ data: requests ? [] : [session] })),
        http.delete(`${sessionsUrl}/7`, () => {
            requests++;
            return new HttpResponse(null, { status: 204 });
        }),
    );

    const trigger = await screen.findByRole('button', { name: 'Eliminar sesión' });
    await user.click(trigger);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(requests).toBe(0);
    await user.click(trigger);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar eliminación' }));

    expect(await screen.findByText('Todavía no tienes sesiones de entrenamiento.')).toBeInTheDocument();
    expect(requests).toBe(1);
    expect(queryClient.getQueryState(getGetTrainingSessionQueryKey(7))).toBeUndefined();
});

test('shows the API deletion conflict and keeps the session available', async () => {
    const { user } = renderPage('/training-sessions/7');
    server.use(http.delete(`${sessionsUrl}/7`, () => new HttpResponse(null, { status: 409 })));
    await user.click(await screen.findByRole('button', { name: 'Eliminar sesión' }));
    const dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: 'Confirmar eliminación' }));

    expect(await dialog.findByRole('alert')).toHaveTextContent('La sesión está vinculada a un workspace o tiene respuestas.');
    expect(screen.getByRole('heading', { name: session.title, level: 1 })).toBeInTheDocument();
});
