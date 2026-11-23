import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { useAuth } from '../auth/useAuth';
import { useListWorkspaces } from '../api/generated/workspaces/workspaces';
import { useListTrainingSessions } from '../api/generated/training-sessions/training-sessions';

export function DashboardPage() {
    const { user } = useAuth();

    const workspacesQuery = useListWorkspaces();
    const sessionsQuery = useListTrainingSessions();

    const workspaces = workspacesQuery.data?.data ?? [];
    const sessions = sessionsQuery.data?.data ?? [];

    const activeWorkspaces = workspaces.filter(
        workspace => workspace.status === 'active'
    );

    if (workspacesQuery.isPending || sessionsQuery.isPending) {
        return <p>Cargando dashboard...</p>;
    }

    if (workspacesQuery.isError || sessionsQuery.isError) {
        return (
            <Alert variant="destructive">
                No se pudo cargar el dashboard.
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-primary">
                    Dashboard
                </h1>
                <p className="mt-2 text-muted">
                    Bienvenido, {user?.name}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <p className="text-sm text-muted">Workspaces</p>
                    <p className="mt-2 text-3xl font-semibold">
                        {workspaces.length}
                    </p>
                </Card>

                <Card>
                    <p className="text-sm text-muted">Workspaces activos</p>
                    <p className="mt-2 text-3xl font-semibold">
                        {activeWorkspaces.length}
                    </p>
                </Card>

                <Card>
                    <p className="text-sm text-muted">Sesiones propias</p>
                    <p className="mt-2 text-3xl font-semibold">
                        {sessions.length}
                    </p>
                </Card>
            </div>
        </div>
    );
}