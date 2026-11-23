import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw/http';
import { afterEach, beforeEach, expect, test } from 'vitest';
import App from '../App';
import { setAccessToken } from '../auth/session';
import { server } from '../test/mocks/server';
import { renderWithProviders } from '../test/renderWithProviders';
import userEvent from '@testing-library/user-event';

const apiUrl = import.meta.env.VITE_API_URL;

beforeEach(() => {
    setAccessToken('test-token');

    server.use(
        http.get(`${apiUrl}/users/me`, () =>
            HttpResponse.json({
                data: {
                    id: 1,
                    name: 'Test User',
                    email: 'test@example.com',
                },
            }),
        ),
    );
});

afterEach(() => setAccessToken(null));

test('displays accessible workspaces', async () => {
    server.use(
        http.get(`${apiUrl}/workspaces`, () =>
            HttpResponse.json({
                data: [
                    {
                        id: 1,
                        title: 'Road to GM',
                        status: 'active',
                        role: 'owner',
                    },
                    {
                        id: 2,
                        title: 'Advanced Group',
                        status: 'paused',
                        role: 'coach',
                    },
                ],
            }),
        ),
    );

    renderWithProviders(<App />, '/workspaces');

    expect(await screen.findByText('Road to GM'))
        .toBeInTheDocument();

    expect(screen.getByText('Advanced Group'))
        .toBeInTheDocument();
    
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Pausado')).toBeInTheDocument();
    expect(screen.getByText('Propietario')).toBeInTheDocument();
    expect(screen.getByText('Entrenador')).toBeInTheDocument();
});

test('displays an empty state when no workspaces exist', async () => {
    renderWithProviders(<App />, '/workspaces');

    expect(
        await screen.findByText('No tienes workspaces todavía.')
    ).toBeInTheDocument();
});

test('displays an error when workspaces cannot be loaded', async () => {
    server.use(
        http.get(`${apiUrl}/workspaces`, () =>
            new HttpResponse(null, { status: 500 }),
        ),
    );

    renderWithProviders(<App />, '/workspaces');

    expect(await screen.findByRole('alert'))
        .toHaveTextContent('No se pudieron cargar los workspaces.');
});

test('displays a button to create a workspace', async () => {
    renderWithProviders(<App />, '/workspaces');

    expect(
        await screen.findByRole('button', {
            name: 'Crear workspace',
        })
    ).toBeInTheDocument();
});

test('opens the workspace creation form', async () => {
    const user = userEvent.setup();

    renderWithProviders(<App />, '/workspaces');

    await user.click(
        await screen.findByRole('button', {
            name: 'Crear workspace',
        })
    );

    expect(screen.getByLabelText('Nombre del workspace'))
        .toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Guardar' }))
        .toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Cancelar' }))
        .toBeInTheDocument();
});

test('closes the workspace creation form when cancelled', async () => {
    const user = userEvent.setup();

    renderWithProviders(<App />, '/workspaces');

    await user.click(
        await screen.findByRole('button', {
            name: 'Crear workspace',
        })
    );

    expect(screen.getByLabelText('Nombre del workspace'))
        .toBeInTheDocument();

    await user.click(
        screen.getByRole('button', { name: 'Cancelar' })
    );

    expect(screen.queryByLabelText('Nombre del workspace'))
        .not.toBeInTheDocument();
});

test('creates a workspace and updates the workspace list', async () => {
    const user = userEvent.setup();

    const createdWorkspace = {
        id: 3,
        title: 'Road to GM',
        status: 'active',
        role: 'owner',
    };

    let created = false;

    server.use(
        http.get(`${apiUrl}/workspaces`, () =>
            HttpResponse.json({
                data: created ? [createdWorkspace] : [],
            }),
        ),

        http.post(`${apiUrl}/workspaces`, async ({ request }) => {
            expect(await request.json()).toEqual({
                title: 'Road to GM',
            });

            created = true;

            return HttpResponse.json(
                { data: createdWorkspace },
                { status: 201 },
            );
        }),
    );

    renderWithProviders(<App />, '/workspaces');

    await user.click(
        await screen.findByRole('button', {
            name: 'Crear workspace',
        })
    );

    await user.type(
        screen.getByLabelText('Nombre del workspace'),
        'Road to GM',
    );

    await user.click(
        screen.getByRole('button', { name: 'Guardar' })
    );

    expect(await screen.findByText('Road to GM'))
        .toBeInTheDocument();

    expect(screen.queryByLabelText('Nombre del workspace'))
        .not.toBeInTheDocument();
});

test('displays an error when workspace creation fails', async () => {
    server.use(
        http.post(`${apiUrl}/workspaces`, () =>
            HttpResponse.json(
                { message: 'Validation failed.' },
                { status: 422 },
            ),
        ),
    );

    const user = userEvent.setup();

    renderWithProviders(<App />, '/workspaces');

    await user.click(
        await screen.findByRole('button', {
            name: 'Crear workspace',
        })
    );

    await user.type(
        screen.getByLabelText('Nombre del workspace'),
        'Road to GM',
    );

    await user.click(
        screen.getByRole('button', { name: 'Guardar' })
    );

    expect(await screen.findByRole('alert'))
        .toHaveTextContent('No se pudo crear el workspace.');

    expect(screen.getByLabelText('Nombre del workspace'))
        .toHaveValue('Road to GM');
});

