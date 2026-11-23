import { useListWorkspaces } from '../api/generated/workspaces/workspaces';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Plus } from 'lucide-react';
import { workspaceRoles, workspaceStatuses } from '../features/workspaces/workspaceLabels';
import { useState } from 'react';
import { CreateWorkspaceForm } from '../features/workspaces/CreateWorkspaceForm';
import { Link } from 'react-router';

export function WorkspacesPage() {
    const workspacesQuery = useListWorkspaces();
    const workspaces = workspacesQuery.data?.data ?? [];
    const [showCreateForm, setShowCreateForm] = useState(false);

    if (workspacesQuery.isPending) {
        return <p>Cargando workspaces...</p>;
    }

    if (workspacesQuery.isError) {
        return (
            <Alert variant="destructive">
                No se pudieron cargar los workspaces.
            </Alert>
        );
    }

return (
    <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-primary">
                Workspaces
            </h1>

            <Button
                className="flex items-center gap-2"
                onClick={() => setShowCreateForm(true)}
            >
                <Plus size={18} aria-hidden="true" />
                Crear workspace
            </Button>
        </header>
        {showCreateForm && (
            <CreateWorkspaceForm
                onCancel={() => setShowCreateForm(false)}
            />
        )}

        {workspaces.length === 0 ? (
            <Card>
                <p className="text-muted">
                    No tienes workspaces todavía.
                </p>
            </Card>
        ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {workspaces.map((workspace) => (
                    <Card key={workspace.id}>
                        <h2 className="text-lg font-semibold">
                            <Link
                                to={`/workspaces/${workspace.id}`}
                                className="hover:text-primary hover:underline"
                            >
                                {workspace.title}
                            </Link>
                        </h2>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant={workspaceStatuses[workspace.status].variant}>
                                {workspaceStatuses[workspace.status].label}
                            </Badge>

                            <Badge>
                                {workspaceRoles[workspace.role]}
                            </Badge>
                        </div>
                    </Card>
                ))}
            </div>
        )}
    </div>
);
}