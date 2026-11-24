import { Link, useParams, useNavigate } from 'react-router';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { workspaceStatuses, workspaceRoles } from '../features/workspaces/workspaceLabels';
import { Button } from '../components/ui/Button';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { EditWorkspaceForm } from '../features/workspaces/EditWorkspaceForm';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useQueryClient } from '@tanstack/react-query';
import {
    useGetWorkspace,
    useDeleteWorkspace,
    getListWorkspacesQueryKey,
    getGetWorkspaceQueryKey,
} from '../api/generated/workspaces/workspaces';

export function WorkspaceDetailPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const deleteWorkspace = useDeleteWorkspace();
    const [showEditForm, setShowEditForm] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const { id } = useParams();
    const workspaceId = Number(id);
    const validId = Number.isSafeInteger(workspaceId) && workspaceId > 0;

    const workspaceQuery = useGetWorkspace(workspaceId, {
        query: {
            enabled: validId,
        },
    });

    if (!validId) {
        return <Alert variant="destructive">Workspace inválido.</Alert>;
    }

    if (workspaceQuery.isPending) {
        return <p>Cargando workspace...</p>;
    }

    if (workspaceQuery.isError || !workspaceQuery.data) {
        return (
            <Alert variant="destructive">
                No se pudo cargar el workspace.
            </Alert>
        );
    }

    const workspace = workspaceQuery.data.data;
    const status = workspaceStatuses[workspace.status];

    function handleDelete() {
        deleteWorkspace.mutate(
            {
                workspace: workspace.id,
            },
            {
                onSuccess: async () => {
                    await queryClient.invalidateQueries({
                        queryKey: getListWorkspacesQueryKey(),
                    });

                    navigate('/workspaces', { replace: true });

                    queryClient.removeQueries({
                        queryKey: getGetWorkspaceQueryKey(workspace.id),
                        exact: true,
                    });
                },
            },
        );
    }

    return (
        <div className="@container mx-auto max-w-6xl space-y-6">
            <Link to="/workspaces" className="inline-flex min-h-10 items-center rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
                Volver a workspaces
            </Link>

            <Card>
                <div className="grid gap-5 @min-[48rem]:grid-cols-[minmax(0,1fr)_auto] @min-[48rem]:items-start">
                    <div className="min-w-0">
                        <h1 className="text-3xl font-bold tracking-tight wrap-anywhere text-primary sm:text-4xl">
                            {workspace.title}
                        </h1>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <Badge variant={status.variant}>
                                {status.label}
                            </Badge>

                            <Badge>
                                {workspaceRoles[workspace.role]}
                            </Badge>
                        </div>
                    </div>

                    {workspace.role === 'owner' && (
                        <div className="grid gap-2 @min-[29rem]:flex @min-[29rem]:flex-wrap">
                            <Button
                                variant="secondary"
                                className="flex items-center justify-center gap-2"
                                onClick={() => setShowEditForm(true)}
                            >
                                <Pencil size={18} aria-hidden="true" />
                                Editar workspace
                            </Button>

                            <Button
                                variant="destructive"
                                className="flex items-center justify-center gap-2"
                                onClick={() => setShowDeleteDialog(true)}
                            >
                                <Trash2 size={18} aria-hidden="true" />
                                Eliminar workspace
                            </Button>
                        </div>
                    )}
                </div>
            </Card>
            {showEditForm && (
                <EditWorkspaceForm
                    workspace={workspace}
                    onCancel={() => setShowEditForm(false)}
                />
            )}
            {showDeleteDialog && (
                <ConfirmDialog
                    title="Eliminar workspace"
                    description="Esta acción no se puede deshacer."
                    onConfirm={handleDelete}
                    onCancel={() => {
                        deleteWorkspace.reset();
                        setShowDeleteDialog(false);
                    }}
                    isPending={deleteWorkspace.isPending}
                    error={
                        deleteWorkspace.isError
                            ? 'No se pudo eliminar el workspace.'
                            : undefined
                    }
                />
            )}
        </div>
    );
}
