import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '../auth/AuthProvider';

export function renderWithProviders(
    children: ReactNode,
    initialPath = '/',
) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[initialPath]}>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </MemoryRouter>
        </QueryClientProvider>
    );
}