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

test('displays the delete button for the workspace owner', async () => {
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

    expect(await screen.findByRole('button', {
        name: 'Eliminar workspace',
    })).toBeInTheDocument();
});

test('asks for confirmation before deleting a workspace', async () => {
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
            name: 'Eliminar workspace',
        })
    );

    expect(screen.getByRole('dialog', { name: 'Eliminar workspace' }))
        .toHaveAccessibleDescription('Esta acción no se puede deshacer.');

    expect(screen.getByText('Esta acción no se puede deshacer.'))
        .toBeInTheDocument();

    expect(screen.getByRole('button', {
        name: 'Confirmar eliminación',
    })).toBeInTheDocument();

    expect(screen.getByRole('button', {
        name: 'Cancelar',
    })).toBeInTheDocument();
});

test('cancels workspace deletion without deleting it', async () => {
    let deleted = false;

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

        http.delete(`${apiUrl}/workspaces/1`, () => {
            deleted = true;
            return new HttpResponse(null, { status: 204 });
        }),
    );

    const user = userEvent.setup();

    renderWithProviders(<App />, '/workspaces/1');

    const trigger = await screen.findByRole('button', { name: 'Eliminar workspace' });
    await user.click(trigger);

    await user.click(
        screen.getByRole('button', { name: 'Cancelar' })
    );

    expect(screen.queryByRole('dialog'))
        .not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    expect(screen.getByRole('heading', { name: 'Road to GM' }))
        .toBeInTheDocument();

    expect(deleted).toBe(false);
});

test('deletes the workspace and redirects to the workspace list', async () => {
    const workspace = {
        id: 1,
        title: 'Road to GM',
        status: 'active',
        role: 'owner',
    };

    let deleted = false;

    server.use(
        http.get(`${apiUrl}/workspaces/1`, () =>
            HttpResponse.json({ data: workspace }),
        ),

        http.get(`${apiUrl}/workspaces`, () =>
            HttpResponse.json({
                data: deleted ? [] : [workspace],
            }),
        ),

        http.delete(`${apiUrl}/workspaces/1`, () => {
            deleted = true;

            return new HttpResponse(null, { status: 204 });
        }),
    );

    const user = userEvent.setup();

    renderWithProviders(<App />, '/workspaces/1');

    await user.click(
        await screen.findByRole('button', {
            name: 'Eliminar workspace',
        })
    );

    await user.click(
        screen.getByRole('button', {
            name: 'Confirmar eliminación',
        })
    );

    expect(
        await screen.findByText('No tienes workspaces todavía.')
    ).toBeInTheDocument();

    expect(deleted).toBe(true);

    expect(screen.queryByRole('dialog'))
        .not.toBeInTheDocument();
});

test('displays an error when workspace deletion fails', async () => {
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

        http.delete(`${apiUrl}/workspaces/1`, () =>
            new HttpResponse(null, { status: 500 }),
        ),
    );

    const user = userEvent.setup();

    renderWithProviders(<App />, '/workspaces/1');

    await user.click(
        await screen.findByRole('button', {
            name: 'Eliminar workspace',
        })
    );

    await user.click(
        screen.getByRole('button', {
            name: 'Confirmar eliminación',
        })
    );

    expect(await screen.findByRole('alert'))
        .toHaveTextContent('No se pudo eliminar el workspace.');

    expect(screen.getByRole('dialog'))
        .toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Road to GM' }))
        .toBeInTheDocument();
});
