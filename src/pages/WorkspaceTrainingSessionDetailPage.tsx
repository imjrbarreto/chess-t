import { isAxiosError } from 'axios';
import { Link, useParams } from 'react-router';
import { useGetWorkspaceTrainingSession } from '../api/generated/workspace-training-sessions/workspace-training-sessions';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { trainingCategoryLabels, trainingCategoryVariants } from '../features/training-sessions/trainingSessionLabels';
import { WorkspaceTrainingSessionExport } from '../features/workspaces/WorkspaceTrainingSessionExport';
import { WorkspaceTrainingSessionResponses } from '../features/workspaces/WorkspaceTrainingSessionResponses';

const backLinkClass = 'inline-flex min-h-10 items-center rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary';

function WorkspaceTrainingSession({ workspaceId, sessionId }: { workspaceId: number; sessionId: number }) {
    const sessionQuery = useGetWorkspaceTrainingSession(workspaceId, sessionId, { query: { retry: false } });

    if (sessionQuery.isPending) {
        return <p role="status" className="text-sm text-muted">Cargando sesión...</p>;
    }

    if (sessionQuery.isError) {
        const status = isAxiosError(sessionQuery.error) ? sessionQuery.error.response?.status : undefined;

        return (
            <Alert variant="destructive">
                {status === 403
                    ? 'No tienes permiso para ver esta sesión en el workspace.'
                    : status === 404
                        ? 'No se encontró la sesión en este workspace.'
                        : 'No se pudo cargar la sesión.'}
            </Alert>
        );
    }

    const { title, category, description, resource } = sessionQuery.data.data;

    return (
        <>
            <Card className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,auto)] sm:items-start">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight wrap-anywhere text-primary sm:text-4xl">{title}</h1>
                        <Badge className="mt-3" variant={trainingCategoryVariants[category]}>
                            {trainingCategoryLabels[category]}
                        </Badge>
                    </div>
                    <WorkspaceTrainingSessionExport key={`${workspaceId}/${sessionId}`} workspaceId={workspaceId} sessionId={sessionId} />
                </div>

                <dl className="grid gap-4 text-sm">
                    <div>
                        <dt className="font-semibold">Descripción</dt>
                        <dd className="mt-1 wrap-anywhere whitespace-pre-wrap text-muted">{description || 'Sin descripción'}</dd>
                    </div>
                    <div>
                        <dt className="font-semibold">Recurso</dt>
                        <dd className="mt-1 wrap-anywhere text-muted">
                            {resource && /^https?:\/\//i.test(resource) ? (
                                <a href={resource} className="text-primary underline underline-offset-2">{resource}</a>
                            ) : resource || 'Sin recurso'}
                        </dd>
                    </div>
                </dl>
            </Card>
            <WorkspaceTrainingSessionResponses workspaceId={workspaceId} sessionId={sessionId} />
        </>
    );
}

export function WorkspaceTrainingSessionDetailPage() {
    const { workspaceId: workspaceParam, sessionId: sessionParam } = useParams();
    const workspaceId = Number(workspaceParam);
    const sessionId = Number(sessionParam);
    const validWorkspace = Number.isSafeInteger(workspaceId) && workspaceId > 0;
    const validSession = Number.isSafeInteger(sessionId) && sessionId > 0;

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <Link to={validWorkspace ? `/workspaces/${workspaceId}?tab=sessions` : '/workspaces'} className={backLinkClass}>
                {validWorkspace ? 'Volver a sesiones del workspace' : 'Volver a workspaces'}
            </Link>
            {validWorkspace && validSession
                ? <WorkspaceTrainingSession workspaceId={workspaceId} sessionId={sessionId} />
                : <Alert variant="destructive">{validWorkspace ? 'Sesión inválida.' : 'Workspace inválido.'}</Alert>}
        </div>
    );
}
