import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router';
import { afterEach, expect, test } from 'vitest';
import { AuthProvider } from '../auth/AuthProvider';
import { LoginPage } from './LoginPage';
import userEvent from '@testing-library/user-event';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw/http';
import { setAccessToken } from '../auth/session';


afterEach(() => {
    setAccessToken(null);
});

function renderLoginPage() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/login']}>
                <AuthProvider>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route
                            path="/dashboard"
                            element={<h1>Dashboard</h1>}
                        />
                    </Routes>
                </AuthProvider>
            </MemoryRouter>
        </QueryClientProvider>
    );
}

test('renders the login form', () => {
    renderLoginPage();

    expect(screen.getByLabelText('Correo electrónico'))
        .toBeInTheDocument();

    expect(screen.getByLabelText('Contraseña'))
        .toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Iniciar sesión' }))
        .toBeInTheDocument();
});

test('displays an error when credentials are invalid', async () => {
    server.use(
      http.post(`${import.meta.env.VITE_API_URL}/login`, () => {
          console.log('MSW: petición interceptada');

          return HttpResponse.json(
              { message: 'Invalid credentials.' },
              { status: 401 },
          );
      }),
  );

    const user = userEvent.setup();

    renderLoginPage();

    await user.type(
        screen.getByLabelText('Correo electrónico'),
        'test@example.com',
    );

    await user.type(
        screen.getByLabelText('Contraseña'),
        'wrong-password',
    );

    await user.click(
        screen.getByRole('button', { name: 'Iniciar sesión' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
        'El correo electrónico o la contraseña son incorrectos.',
    );
});

test('redirects to dashboard after successful login', async () => {
    const authenticatedUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
    };

    server.use(
        http.post(`${import.meta.env.VITE_API_URL}/login`, () => {
            return HttpResponse.json({
                data: authenticatedUser,
                token: {
                    token_type: 'Bearer',
                    access_token: 'test-token',
                },
            });
        }),

        http.get(`${import.meta.env.VITE_API_URL}/users/me`, () => {
            return HttpResponse.json({
                data: authenticatedUser,
            });
        }),
    );

    const user = userEvent.setup();

    renderLoginPage();

    await user.type(
        screen.getByLabelText('Correo electrónico'),
        'test@example.com',
    );

    await user.type(
        screen.getByLabelText('Contraseña'),
        'password123',
    );

    await user.click(
        screen.getByRole('button', { name: 'Iniciar sesión' }),
    );

    expect(
        await screen.findByRole('heading', { name: 'Dashboard' })
    ).toBeInTheDocument();

    expect(sessionStorage.getItem('elometrics.accessToken'))
        .toBe('test-token');
});