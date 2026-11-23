import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Input } from './Input';

test('renders an input with its associated label', () => {
    render(<Input id="email" label="Correo electrónico" />);

    expect(
        screen.getByLabelText('Correo electrónico')
    ).toBeInTheDocument();
});

test('displays a validation error', () => {
    render(
        <Input
            id="email"
            label="Correo electrónico"
            error="El correo es obligatorio."
        />
    );

    expect(
        screen.getByText('El correo es obligatorio.')
    ).toBeInTheDocument();

    expect(
        screen.getByLabelText('Correo electrónico')
    ).toHaveAttribute('aria-invalid', 'true');
});