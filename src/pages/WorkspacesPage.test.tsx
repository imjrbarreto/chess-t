import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw/http';
import { afterEach, beforeEach, expect, test } from 'vitest';
import App from '../App';
import { setAccessToken } from '../auth/session';
import { server } from '../test/mocks/server';
import { renderWithProviders } from '../test/renderWithProviders';

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

