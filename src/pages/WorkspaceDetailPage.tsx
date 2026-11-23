import { Link, useParams } from 'react-router';
import { useGetWorkspace } from '../api/generated/workspaces/workspaces';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { workspaceStatuses, workspaceRoles } from '../features/workspaces/workspaceLabels';
import { Button } from '../components/ui/Button';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { EditWorkspaceForm } from '../features/workspaces/EditWorkspaceForm';

export function WorkspaceDetailPage() {
    const [showEditForm, setShowEditForm] = useState(false);

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
    

    return (
        <div className="space-y-6">
            <Link to="/workspaces" className="text-sm text-primary hover:underline">
                Volver a workspaces
            </Link>

            <Card>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold text-primary">
                        {workspace.title}
                    </h1>

                    {workspace.role === 'owner' && (
                        <Button
                            variant="secondary"
                            className="flex items-center gap-2"
                            onClick={() => setShowEditForm(true)}
                        >
                            <Pencil size={18} aria-hidden="true" />
                            Editar workspace
                        </Button>
                    )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant={status.variant}>
                        {status.label}
                    </Badge>

                    <Badge>
                        {workspaceRoles[workspace.role]}
                    </Badge>
                </div>
            </Card>
            {showEditForm && (
                <EditWorkspaceForm
                    workspace={workspace}
                    onCancel={() => setShowEditForm(false)}
                />
            )}
        </div>
    );
}