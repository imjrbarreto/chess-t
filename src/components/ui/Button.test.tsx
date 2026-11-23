import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Button } from './Button';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

test('renders the button with its text', () => {
    render(<Button>Crear workspace</Button>);

    expect(
        screen.getByRole('button', { name: 'Crear workspace' })
    ).toBeInTheDocument();
});

test('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={onClick}>Crear</Button>);

    await user.click(screen.getByRole('button', { name: 'Crear' }));

    expect(onClick).toHaveBeenCalledOnce();
});

test('does not call onClick when disabled', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={onClick} disabled>Crear</Button>);

    const button = screen.getByRole('button', { name: 'Crear' });

    expect(button).toBeDisabled();

    await user.click(button);

    expect(onClick).not.toHaveBeenCalled();
});