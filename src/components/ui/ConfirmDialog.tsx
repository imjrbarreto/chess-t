import { useId, useLayoutEffect, useRef } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { Alert } from './Alert';

interface ConfirmDialogProps {
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel: () => void;
    isPending?: boolean;
    error?: string;
}

export function ConfirmDialog({
    title,
    description,
    onConfirm,
    onCancel,
    isPending = false,
    error,
}: ConfirmDialogProps) {
    const titleId = useId();
    const descriptionId = useId();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);

    useLayoutEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const trigger = document.activeElement;
        dialog.showModal();

        return () => {
            dialog.close();
            if (trigger instanceof HTMLElement && trigger.isConnected) {
                trigger.focus();
            }
        };
    }, []);

    useLayoutEffect(() => {
        if (isPending) {
            titleRef.current?.focus();
        } else {
            cancelRef.current?.focus();
        }
    }, [isPending]);

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            aria-modal="true"
            className="fixed inset-0 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl bg-transparent p-0 text-foreground backdrop:bg-black/40"
            onCancel={(event) => {
                event.preventDefault();
                if (!isPending) onCancel();
            }}
            onKeyDown={(event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!isPending) onCancel();
                    return;
                }

                if (event.key !== 'Tab') return;

                if (isPending) {
                    event.preventDefault();
                    titleRef.current?.focus();
                } else if (event.shiftKey && event.target === cancelRef.current) {
                    event.preventDefault();
                    confirmRef.current?.focus();
                } else if (!event.shiftKey && event.target === confirmRef.current) {
                    event.preventDefault();
                    cancelRef.current?.focus();
                }
            }}
        >
            <Card>
                <h2 id={titleId} ref={titleRef} tabIndex={-1} className="text-xl font-semibold">
                    {title}
                </h2>

                <p id={descriptionId} className="mt-3 text-sm text-muted">
                    {description}
                </p>

                {error && (
                    <Alert variant="destructive" className="mt-4">
                        {error}
                    </Alert>
                )}

                <div className="mt-6 grid gap-3 sm:flex sm:justify-end">
                    <Button
                        ref={cancelRef}
                        variant="secondary"
                        onClick={onCancel}
                        disabled={isPending}
                    >
                        Cancelar
                    </Button>

                    <Button
                        ref={confirmRef}
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isPending}
                    >
                        {isPending ? 'Eliminando...' : 'Confirmar eliminación'}
                    </Button>
                </div>
            </Card>
        </dialog>
    );
}
