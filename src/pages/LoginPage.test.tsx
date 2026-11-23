import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, test } from 'vitest';
import { AuthProvider } from '../auth/AuthProvider';
import { LoginPage } from './LoginPage';
import userEvent from '@testing-library/user-event';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw/http';


function renderLoginPage() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <AuthProvider>
                    <LoginPage />
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