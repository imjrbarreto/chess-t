import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, expect, test } from 'vitest';
import App from '../App';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { setAccessToken } from '../auth/session';
import { server } from '../test/mocks/server';
import { renderWithProviders } from '../test/renderWithProviders';
import { AppLayout } from './AppLayout';

beforeEach(() => {
    setAccessToken('test-token');

    server.use(
        http.get(`${import.meta.env.VITE_API_URL}/users/me`, () =>
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

test('renders the dashboard inside the authenticated layout with an active navigation link', async () => {
    renderWithProviders(<App />);

    const header = await screen.findByRole('banner');

    expect(within(header).getByText('EloMetrics')).toBeInTheDocument();
    expect(within(header).getByText('Test User')).toBeInTheDocument();
    expect(within(header).getByRole('button', { name: 'Cerrar sesión' }))
        .toBeEnabled();

    const sidebar = screen.getByRole('complementary');
    const navigation = within(sidebar).getByRole('navigation', {
        name: 'Navegación principal',
    });

    expect(within(navigation).getByRole('link', {
        name: 'Dashboard',
        current: 'page',
    })).toHaveAttribute('href', '/dashboard');

    expect(await within(screen.getByRole('main')).findByRole('heading', {
        name: 'Dashboard',
        level: 1,
    })).toBeInTheDocument();
});

test('opens the mobile menu and closes it with Escape or after navigating', async () => {
    const user = userEvent.setup();

    renderWithProviders(
        <Routes>
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="/otra-ruta" element={<h1>Otra ruta</h1>} />
                    <Route path="/dashboard" element={<h1>Dashboard</h1>} />
                </Route>
            </Route>
        </Routes>,
        '/otra-ruta',
    );

    const menu = await screen.findByRole('button', { name: 'Menú' });
    const sidebar = screen.getByRole('complementary');

    expect(menu).toHaveAttribute('aria-controls', sidebar.id);
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(sidebar).toHaveClass('hidden');

    await user.click(menu);

    expect(menu).toHaveAttribute('aria-expanded', 'true');
    expect(sidebar).not.toHaveClass('hidden');

    const dashboard = within(sidebar).getByRole('link', {
        name: 'Dashboard',
    });

    expect(dashboard).not.toHaveAttribute('aria-current');

    dashboard.focus();
    await user.keyboard('{Escape}');

    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveFocus();

    await user.click(menu);
    await user.click(dashboard);

    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(sidebar).toHaveClass('hidden');
    expect(dashboard).toHaveAttribute('aria-current', 'page');

    const main = screen.getByRole('main');

    expect(main).toHaveFocus();
    expect(within(main).getByRole('heading', {
        name: 'Dashboard',
    })).toBeInTheDocument();
});

test('opens and closes the user menu', async () => {
    const user = userEvent.setup();

    renderWithProviders(<App />, '/dashboard');

    const menu = await screen.findByRole('button', {
        name: 'Menú de usuario',
    });

    expect(menu).toHaveAttribute('aria-expanded', 'false');

    await user.click(menu);

    expect(menu).toHaveAttribute('aria-expanded', 'true');

    const userMenu = document.getElementById('user-menu')!;

    expect(within(userMenu).getByText('Test User'))
        .toBeInTheDocument();

    expect(within(userMenu).getByRole('button', {
        name: 'Cerrar sesión',
    })).toBeEnabled();

    await user.keyboard('{Escape}');

    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveFocus();
    expect(document.getElementById('user-menu')).not.toBeInTheDocument();
});

test('closes the user menu when opening navigation', async () => {
    const user = userEvent.setup();

    renderWithProviders(<App />, '/dashboard');

    const userMenu = await screen.findByRole('button', {
        name: 'Menú de usuario',
    });

    const navigationMenu = screen.getByRole('button', {
        name: 'Menú',
    });

    await user.click(userMenu);

    expect(userMenu).toHaveAttribute('aria-expanded', 'true');

    await user.click(navigationMenu);

    expect(userMenu).toHaveAttribute('aria-expanded', 'false');
    expect(navigationMenu).toHaveAttribute('aria-expanded', 'true');

    await user.click(userMenu);

    expect(navigationMenu).toHaveAttribute('aria-expanded', 'false');
    expect(userMenu).toHaveAttribute('aria-expanded', 'true');
});