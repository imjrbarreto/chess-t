import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

test('cycles focus with Tab and Shift+Tab, then restores focus after Escape', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    function Example() {
        const [open, setOpen] = useState(false);

        return (
            <>
                <button onClick={() => setOpen(true)}>Eliminar</button>
                {open && (
                    <ConfirmDialog
                        title="Eliminar workspace"
                        description="Esta acción no se puede deshacer."
                        onConfirm={onConfirm}
                        onCancel={() => setOpen(false)}
                    />
                )}
            </>
        );
    }

    render(<Example />);

    const trigger = screen.getByRole('button', { name: 'Eliminar' });
    trigger.focus();
    await user.keyboard('{Enter}');

    const cancel = screen.getByRole('button', { name: 'Cancelar' });
    const confirm = screen.getByRole('button', { name: 'Confirmar eliminación' });
    expect(cancel).toHaveFocus();
    await user.tab();
    expect(confirm).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(onConfirm).not.toHaveBeenCalled();
});

test('keeps focus in the dialog and blocks dismissal while confirmation is pending', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const props = {
        title: 'Eliminar workspace',
        description: 'Esta acción no se puede deshacer.',
        onConfirm: vi.fn(),
        onCancel,
    };

    const { rerender } = render(<ConfirmDialog {...props} />);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Confirmar eliminación' })).toHaveFocus();

    rerender(<ConfirmDialog {...props} isPending />);
    const heading = screen.getByRole('heading', { name: props.title });
    expect(heading).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Eliminando...' })).toBeDisabled();

    await user.tab();
    await user.keyboard('{Escape}');
    expect(fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))).toBe(false);
    expect(heading).toHaveFocus();
    expect(onCancel).not.toHaveBeenCalled();

    rerender(<ConfirmDialog {...props} error="No se pudo eliminar el workspace." />);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo eliminar el workspace.');
});
