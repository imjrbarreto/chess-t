import { useListWorkspaces } from '../api/generated/workspaces/workspaces';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';


const statusLabels = {
    active: 'Activo',
    paused: 'Pausado',
    archived: 'Archivado',
};

const roleLabels = {
    owner: 'Propietario',
    coach: 'Entrenador',
    student: 'Alumno',
    viewer: 'Observador',
};

const statusVariants = {
    active: 'success',
    paused: 'warning',
    archived: 'default',
} as const;

export function WorkspacesPage() {
    const workspacesQuery = useListWorkspaces();
    const workspaces = workspacesQuery.data?.data ?? [];

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

    if (workspaces.length === 0) {
        return (
            <Card>
                <p className="text-muted">
                    No tienes workspaces todavía.
                </p>
            </Card>
        );
    }
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-primary">
                Workspaces
            </h1>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {workspaces.map((workspace) => (
                    <Card key={workspace.id}>
                        <h2 className="text-lg font-semibold">
                            {workspace.title}
                        </h2>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant={statusVariants[workspace.status]}>
                                {statusLabels[workspace.status]}
                            </Badge>

                            <Badge variant="primary">
                                {roleLabels[workspace.role]}
                            </Badge>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}