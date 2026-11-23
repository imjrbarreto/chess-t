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