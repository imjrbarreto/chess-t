import type { Workspace } from '../../api/generated/models';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { workspaceStatuses } from './workspaceLabels';
import type { SubmitEvent } from 'react';
import type { WorkspaceStatus } from '../../api/generated/models';
import { useQueryClient } from '@tanstack/react-query';
import {useUpdateWorkspace, getGetWorkspaceQueryKey, getListWorkspacesQueryKey } from '../../api/generated/workspaces/workspaces';
import { Alert } from '../../components/ui/Alert';

interface EditWorkspaceFormProps {
    workspace: Workspace;
    onCancel: () => void;
}

export function EditWorkspaceForm({
    workspace,
    onCancel,
}: EditWorkspaceFormProps) {
    const queryClient = useQueryClient();
    const updateWorkspace = useUpdateWorkspace();

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);

        updateWorkspace.mutate(
            {
                workspace: workspace.id,
                data: {
                    title: String(formData.get('title')),
                    status: formData.get('status') as WorkspaceStatus,
                },
            },
            {
                onSuccess: async () => {
                    await Promise.all([
                        queryClient.invalidateQueries({
                            queryKey: getGetWorkspaceQueryKey(workspace.id),
                        }),
                        queryClient.invalidateQueries({
                            queryKey: getListWorkspacesQueryKey(),
                        }),
                    ]);

                    onCancel();
                },
            },
        );
    }
    return (
        <Card className="@container">
            <h2 className="text-xl font-semibold tracking-tight">
                Editar workspace
            </h2>

            <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
                <div className="grid gap-4 @min-[34rem]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <Input
                        id="title"
                        name="title"
                        label="Nombre del workspace"
                        defaultValue={workspace.title}
                        required
                        maxLength={255}
                    />

                    <Select
                        id="status"
                        name="status"
                        label="Estado"
                        defaultValue={workspace.status}
                        required
                    >
                        {Object.entries(workspaceStatuses).map(([value, status]) => (
                            <option key={value} value={value}>
                                {status.label}
                            </option>
                        ))}
                    </Select>
                </div>

                {updateWorkspace.isError && (
                    <Alert variant="destructive">
                        No se pudo actualizar el workspace.
                    </Alert>
                )}

                <div className="grid gap-3 @min-[22rem]:flex @min-[22rem]:justify-end">
                    <Button
                        variant="secondary"
                        onClick={onCancel}
                        disabled={updateWorkspace.isPending}
                    >
                        Cancelar
                    </Button>

                    <Button
                        type="submit"
                        disabled={updateWorkspace.isPending}
                    >
                        {updateWorkspace.isPending ? 'Guardando...' : 'Guardar'}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
