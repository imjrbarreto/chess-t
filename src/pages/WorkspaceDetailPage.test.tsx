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

test('displays the workspace details', async () => {
    server.use(
        http.get(`${apiUrl}/workspaces/1`, () =>
            HttpResponse.json({
                data: {
                    id: 1,
                    title: 'Road to GM',
                    status: 'active',
                    role: 'owner',
                },
            }),
        ),
    );

    renderWithProviders(<App />, '/workspaces/1');

    expect(await screen.findByRole('heading', {
        name: 'Road to GM',
    })).toBeInTheDocument();

    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Propietario')).toBeInTheDocument();
});

test('displays the edit button for the workspace owner', async () => {
    server.use(
        http.get(`${apiUrl}/workspaces/1`, () =>
            HttpResponse.json({
                data: {
                    id: 1,
                    title: 'Road to GM',
                    status: 'active',
                    role: 'owner',
                },
            }),
        ),
    );

    renderWithProviders(<App />, '/workspaces/1');

    expect(
        await screen.findByRole('button', {
            name: 'Editar workspace',
        })
    ).toBeInTheDocument();
});

test.each(['coach', 'student', 'viewer'])(
    'does not display the edit button for the %s role',
    async (role) => {
        server.use(
            http.get(`${apiUrl}/workspaces/1`, () =>
                HttpResponse.json({
                    data: {
                        id: 1,
                        title: 'Road to GM',
                        status: 'active',
                        role,
                    },
                }),
            ),
        );

        renderWithProviders(<App />, '/workspaces/1');

        await screen.findByRole('heading', {
            name: 'Road to GM',
        });

        expect(
            screen.queryByRole('button', {
                name: 'Editar workspace',
            })
        ).not.toBeInTheDocument();
    },
);

test('opens the edit form with the current workspace data', async () => {
    server.use(
        http.get(`${apiUrl}/workspaces/1`, () =>
            HttpResponse.json({
                data: {
                    id: 1,
                    title: 'Road to GM',
                    status: 'active',
                    role: 'owner',
                },
            }),
        ),
    );

    const user = userEvent.setup();

    renderWithProviders(<App />, '/workspaces/1');

    await user.click(
        await screen.findByRole('button', {
            name: 'Editar workspace',
        })
    );

    expect(screen.getByLabelText('Nombre del workspace'))
        .toHaveValue('Road to GM');

    expect(screen.getByLabelText('Estado'))
        .toHaveValue('active');

    expect(screen.getByRole('button', { name: 'Guardar' }))
        .toBeInTheDocument();
});

test('updates the workspace title and status', async () => {
    let workspace = {
        id: 1,
        title: 'Road to GM',
        status: 'active',
        role: 'owner',
    };

    server.use(
        http.get(`${apiUrl}/workspaces/1`, () =>
            HttpResponse.json({ data: workspace }),
        ),

        http.patch(`${apiUrl}/workspaces/1`, async ({ request }) => {
            expect(await request.json()).toEqual({
                title: 'Advanced Training',
                status: 'paused',
            });

            workspace = {
                ...workspace,
                title: 'Advanced Training',
                status: 'paused',
            };

            return HttpResponse.json({ data: workspace });
        }),
    );

    const user = userEvent.setup();

    renderWithProviders(<App />, '/workspaces/1');

    await user.click(
        await screen.findByRole('button', {
            name: 'Editar workspace',
        })
    );

    const title = screen.getByLabelText('Nombre del workspace');

    await user.clear(title);
    await user.type(title, 'Advanced Training');

    await user.selectOptions(
        screen.getByLabelText('Estado'),
        'paused',
    );

    await user.click(
        screen.getByRole('button', { name: 'Guardar' })
    );

    expect(await screen.findByRole('heading', {
        name: 'Advanced Training',
        level: 1,
    })).toBeInTheDocument();

    expect(screen.getByText('Pausado')).toBeInTheDocument();

    expect(screen.queryByLabelText('Nombre del workspace'))
        .not.toBeInTheDocument();
});

test('preserves form data when workspace update fails', async () => {
    server.use(
        http.get(`${apiUrl}/workspaces/1`, () =>
            HttpResponse.json({
                data: {
                    id: 1,
                    title: 'Road to GM',
                    status: 'active',
                    role: 'owner',
                },
            }),
        ),

        http.patch(`${apiUrl}/workspaces/1`, () =>
            HttpResponse.json(
                { message: 'Validation failed.' },
                { status: 422 },
            ),
        ),
    );

    const user = userEvent.setup();

    renderWithProviders(<App />, '/workspaces/1');

    await user.click(
        await screen.findByRole('button', {
            name: 'Editar workspace',
        })
    );

    const title = screen.getByLabelText('Nombre del workspace');

    await user.clear(title);
    await user.type(title, 'Advanced Training');

    await user.click(
        screen.getByRole('button', { name: 'Guardar' })
    );

    expect(await screen.findByRole('alert'))
        .toHaveTextContent('No se pudo actualizar el workspace.');

    expect(title).toHaveValue('Advanced Training');
});