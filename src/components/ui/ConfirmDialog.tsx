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
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <Card
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="w-full max-w-md"
            >
                <h2 className="text-xl font-semibold">
                    {title}
                </h2>

                <p className="mt-3 text-sm text-muted">
                    {description}
                </p>

                {error && (
                    <Alert variant="destructive" className="mt-4">
                        {error}
                    </Alert>
                )}

                <div className="mt-6 flex justify-end gap-3">
                    <Button
                        variant="secondary"
                        onClick={onCancel}
                        disabled={isPending}
                    >
                        Cancelar
                    </Button>

                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isPending}
                    >
                        {isPending ? 'Eliminando...' : 'Confirmar eliminación'}
                    </Button>
                </div>
            </Card>
        </div>
    );
}