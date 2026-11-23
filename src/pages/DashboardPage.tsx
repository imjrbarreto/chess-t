import { Activity, ClipboardList, FolderKanban } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { useAuth } from '../auth/useAuth';
import { useListWorkspaces } from '../api/generated/workspaces/workspaces';
import { useListTrainingSessions } from '../api/generated/training-sessions/training-sessions';
import {
    workspaceStatuses,
    workspaceRoles,
} from '../features/workspaces/workspaceLabels';

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

    const statistics = [
        { label: 'Workspaces', value: workspaces.length, Icon: FolderKanban },
        { label: 'Workspaces activos', value: activeWorkspaces.length, Icon: Activity },
        { label: 'Sesiones propias', value: sessions.length, Icon: ClipboardList },
    ];

    return (
        <div className="@container mx-auto max-w-6xl space-y-6 sm:space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
                    Dashboard
                </h1>

                <p className="mt-2 text-muted">
                    Bienvenido, {user?.name}
                </p>
            </header>

            <dl className="grid gap-4 @min-[36rem]:grid-cols-3">
                {statistics.map(({ label, value, Icon }) => (
                    <Card key={label} className="flex flex-col justify-between gap-3">
                        <dt className="flex items-center gap-3 text-sm leading-snug font-medium text-muted @min-[36rem]:flex-col @min-[36rem]:items-start @min-[56rem]:flex-row @min-[56rem]:items-center">
                            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                                <Icon size={20} aria-hidden="true" />
                            </span>
                            {label}
                        </dt>

                        <dd className="text-3xl leading-none font-semibold tabular-nums">
                            {value}
                        </dd>
                    </Card>
                ))}
            </dl>

            <section aria-labelledby="dashboard-workspaces">
                <Card>
                    <h2 id="dashboard-workspaces" className="text-xl font-semibold tracking-tight">
                        Workspaces accesibles
                    </h2>

                    {workspaces.length === 0 ? (
                        <p className="mt-4 text-sm text-muted">
                            Todavía no tienes acceso a ningún workspace.
                        </p>
                    ) : (
                        <ul role="list" className="mt-4 divide-y divide-border border-t border-border">
                            {workspaces.slice(0, 5).map((workspace) => {
                                const status = workspaceStatuses[workspace.status];

                                return (
                                    <li
                                        key={workspace.id}
                                        className="grid gap-2 py-3 last:pb-0 @min-[32rem]:grid-cols-[minmax(0,1fr)_15rem] @min-[32rem]:items-center @min-[32rem]:gap-4"
                                    >
                                        <span className="wrap-anywhere text-sm font-medium">
                                            {workspace.title}
                                        </span>

                                        <div className="flex flex-wrap gap-2 @min-[32rem]:grid @min-[32rem]:grid-cols-2 @min-[32rem]:justify-items-start">
                                            <Badge variant={status.variant}>
                                                {status.label}
                                            </Badge>

                                            <Badge>
                                                {workspaceRoles[workspace.role]}
                                            </Badge>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>
            </section>
        </div>
    );
}