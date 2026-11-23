import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router';
import { afterEach, expect, test } from 'vitest';
import { setAccessToken } from '../auth/session';
import { RegisterPage } from './RegisterPage';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { server } from '../test/mocks/server';
import { renderWithProviders } from '../test/renderWithProviders';

afterEach(() => {
    setAccessToken(null);
});

function renderRegisterPage() {
    return renderWithProviders(
        <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<h1>Dashboard</h1>} />
        </Routes>,
        '/register',
    );
}

test('renders the registration form', () => {
    renderRegisterPage();

    expect(screen.getByLabelText('Nombre'))
        .toBeInTheDocument();

    expect(screen.getByLabelText('Correo electrónico'))
        .toBeInTheDocument();

    expect(screen.getByLabelText('Contraseña', { exact: true }))
        .toBeInTheDocument();

    expect(screen.getByLabelText('Confirmar contraseña'))
        .toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Crear cuenta' }))
        .toBeInTheDocument();
});

test('displays an error when the email is already registered', async () => {
    server.use(
        http.post(`${import.meta.env.VITE_API_URL}/register`, () => {
            return HttpResponse.json(
                {
                    message: 'The email has already been taken.',
                    errors: {
                        email: ['The email has already been taken.'],
                    },
                },
                { status: 422 },
            );
        }),
    );

    const user = userEvent.setup();

    renderRegisterPage();

    await user.type(screen.getByLabelText('Nombre'), 'Test User');
    await user.type(screen.getByLabelText('Correo electrónico'), 'test@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'password123');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'password123');

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByRole('alert'))
        .toHaveTextContent('No se ha podido crear la cuenta.');
});

test('redirects to dashboard after successful registration', async () => {
    const registeredUser = {
        id: 2,
        name: 'Test User',
        email: 'test@example.com',
    };

    server.use(
        http.post(`${import.meta.env.VITE_API_URL}/register`, () => {
            return HttpResponse.json({
                data: registeredUser,
                token: {
                    token_type: 'Bearer',
                    access_token: 'test-token',
                },
            }, { status: 201 });
        }),

        http.get(`${import.meta.env.VITE_API_URL}/users/me`, () => {
            return HttpResponse.json({
                data: registeredUser,
            });
        }),
    );

    const user = userEvent.setup();

    renderRegisterPage();

    await user.type(screen.getByLabelText('Nombre'), 'Test User');
    await user.type(screen.getByLabelText('Correo electrónico'), 'test@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'password123');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'password123');

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
        await screen.findByRole('heading', { name: 'Dashboard' })
    ).toBeInTheDocument();

    expect(sessionStorage.getItem('elometrics.accessToken'))
        .toBe('test-token');
});