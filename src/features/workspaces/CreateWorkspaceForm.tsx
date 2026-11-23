import type { SubmitEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateWorkspace, getListWorkspacesQueryKey } from '../../api/generated/workspaces/workspaces';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';

interface CreateWorkspaceFormProps {
    onCancel: () => void;
}

export function CreateWorkspaceForm({
    onCancel,
}: CreateWorkspaceFormProps) {
    const queryClient = useQueryClient();
    const createWorkspace = useCreateWorkspace();

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);

        createWorkspace.mutate(
            {
                data: {
                    title: String(formData.get('title')),
                },
            },
            {
                onSuccess: async () => {
                    await queryClient.invalidateQueries({
                        queryKey: getListWorkspacesQueryKey(),
                    });

                    onCancel();
                },
            },
        );
    }

    return (
        <Card>
            <h2 className="text-xl font-semibold">
                Nuevo workspace
            </h2>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <Input
                    id="title"
                    name="title"
                    label="Nombre del workspace"
                    required
                    maxLength={255}
                />
                {createWorkspace.isError && (
                    <Alert variant="destructive">
                        No se pudo crear el workspace.
                    </Alert>
                )}

                <div className="flex justify-end gap-3">
                    <Button
                        variant="secondary"
                        onClick={onCancel}
                        disabled={createWorkspace.isPending}
                    >
                        Cancelar
                    </Button>

                    <Button
                        type="submit"
                        disabled={createWorkspace.isPending}
                    >
                        {createWorkspace.isPending ? 'Guardando...' : 'Guardar'}
                    </Button>
                </div>
            </form>
        </Card>
    );
}