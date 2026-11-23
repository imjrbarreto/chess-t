import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Alert } from './Alert';

test('renders an informational message', () => {
    render(<Alert>Completa tu perfil</Alert>);

    expect(screen.getByRole('status'))
        .toHaveTextContent('Completa tu perfil');
});

test('renders an error message with the alert role', () => {
    render(
        <Alert variant="destructive">
            Credenciales incorrectas
        </Alert>
    );

    expect(screen.getByRole('alert'))
        .toHaveTextContent('Credenciales incorrectas');
});