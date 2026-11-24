import { useId, useState } from 'react';
import type { SubmitEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Link } from 'react-router';
import type { TrainingSession, Workspace } from '../../api/generated/models';
import { useListTrainingSessions } from '../../api/generated/training-sessions/training-sessions';
import {
    getListWorkspaceTrainingSessionsQueryKey,
    useLinkTrainingSession,
    useListWorkspaceTrainingSessions,
    useUnlinkTrainingSession,
} from '../../api/generated/workspace-training-sessions/workspace-training-sessions';
import { useAuth } from '../../auth/useAuth';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Select } from '../../components/ui/Select';
import { trainingCategoryLabels, trainingCategoryVariants } from '../training-sessions/trainingSessionLabels';

function getStatus(error: unknown) {
    return isAxiosError(error) ? error.response?.status : undefined;
}

export function WorkspaceTrainingSessions({ workspace }: { workspace: Workspace }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const pickerId = useId();
    const [selectedId, setSelectedId] = useState('');
    const [target, setTarget] = useState<TrainingSession | null>(null);
    const isOwner = workspace.role === 'owner';
    const isCoach = workspace.role === 'coach';
    const canLink = Boolean(user && (isOwner || isCoach));

    const linkedKey = getListWorkspaceTrainingSessionsQueryKey(workspace.id);
    const linkedQuery = useListWorkspaceTrainingSessions(workspace.id, { query: { retry: false } });
    const ownQuery = useListTrainingSessions({ query: { enabled: canLink, retry: false } });
    const linkSession = useLinkTrainingSession({
        mutation: {
            onSuccess: () => queryClient.invalidateQueries({ queryKey: linkedKey, exact: true }),
        },
    });
    const unlinkSession = useUnlinkTrainingSession({
        mutation: {
            onSuccess: () => queryClient.invalidateQueries({ queryKey: linkedKey, exact: true }),
        },
    });

    if (linkedQuery.isPending) {
        return <p role="status" className="text-sm text-muted">Cargando sesiones vinculadas...</p>;
    }
    if (linkedQuery.isError) {
        return (
            <Alert variant="destructive">
                {getStatus(linkedQuery.error) === 403
                    ? 'No tienes permiso para ver las sesiones vinculadas.'
                    : 'No se pudieron cargar las sesiones vinculadas.'}
            </Alert>
        );
    }

    const linked = linkedQuery.data.data;
    const linkedIds = new Set(linked.map(({ id }) => id));
    const available = (ownQuery.data?.data ?? []).filter(
        (session) => session.user_id === user?.id && !linkedIds.has(session.id),
    );
    const selected = available.find((session) => String(session.id) === selectedId);
    const linkStatus = getStatus(linkSession.error);

    function handleLink(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canLink || !selected) return;

        linkSession.mutate({
            workspace: workspace.id,
            data: { training_session_id: selected.id },
        }, {
            onSuccess: () => setSelectedId(''),
        });
    }

    return (
        <div className="space-y-4">
            {canLink && (
                <Card>
                    <h2 className="text-lg font-semibold">Vincular una sesión propia</h2>
                    {ownQuery.isPending ? (
                        <p role="status" className="mt-3 text-sm text-muted">Cargando tus sesiones propias...</p>
                    ) : ownQuery.isError ? (
                        <Alert variant="destructive" className="mt-3">No se pudieron cargar tus sesiones propias.</Alert>
                    ) : available.length === 0 ? (
                        <p className="mt-3 text-sm text-muted">No tienes sesiones propias disponibles para vincular.</p>
                    ) : (
                        <form onSubmit={handleLink} className="mt-4 grid gap-3 @min-[32rem]:grid-cols-[minmax(0,1fr)_auto] @min-[32rem]:items-end">
                            <Select
                                id={pickerId}
                                label="Sesión propia"
                                value={selected ? String(selected.id) : ''}
                                onChange={(event) => setSelectedId(event.currentTarget.value)}
                                required
                                disabled={linkSession.isPending}
                            >
                                <option value="" disabled>Selecciona una sesión</option>
                                {available.map((session) => (
                                    <option key={session.id} value={session.id}>{session.title}</option>
                                ))}
                            </Select>
                            <Button type="submit" disabled={!selected || linkSession.isPending}>
                                {linkSession.isPending ? 'Vinculando...' : 'Vincular sesión'}
                            </Button>
                        </form>
                    )}
                    {linkSession.isError && (
                        <Alert variant="destructive" className="mt-3">
                            {linkStatus === 403
                                ? 'No tienes permiso para vincular esta sesión.'
                                : linkStatus === 422
                                    ? 'La sesión seleccionada no se puede vincular.'
                                    : 'No se pudo vincular la sesión.'}
                        </Alert>
                    )}
                </Card>
            )}

            <Card>
                <h2 className="text-lg font-semibold">Sesiones vinculadas</h2>
                {linked.length === 0 ? (
                    <p className="mt-3 text-sm text-muted">No hay sesiones vinculadas a este workspace.</p>
                ) : (
                    <ul role="list" className="mt-3 divide-y divide-border border-t border-border">
                        {linked.map((session) => (
                            <li key={session.id} className="grid gap-2 py-3 last:pb-0 @min-[30rem]:flex @min-[30rem]:items-center @min-[30rem]:justify-between">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <Link
                                        to={`/workspaces/${workspace.id}/training-sessions/${session.id}`}
                                        className="min-w-0 rounded-sm wrap-anywhere text-sm font-medium text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                                    >
                                        {session.title}
                                    </Link>
                                    <Badge variant={trainingCategoryVariants[session.category]}>
                                        {trainingCategoryLabels[session.category]}
                                    </Badge>
                                </div>
                                {(isOwner || (isCoach && session.user_id === user?.id)) && (
                                    <Button
                                        variant="secondary"
                                        className="justify-self-start @min-[30rem]:shrink-0"
                                        aria-label={`Desvincular ${session.title}`}
                                        disabled={linkSession.isPending}
                                        onClick={() => setTarget(session)}
                                    >
                                        Desvincular
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            {target && (
                <ConfirmDialog
                    title={`Desvincular ${target.title}`}
                    description="La sesión dejará de aparecer en este workspace. La sesión original se conservará."
                    confirmLabel="Confirmar desvinculación"
                    pendingLabel="Desvinculando..."
                    onConfirm={() => unlinkSession.mutate({ workspace: workspace.id, trainingSession: target.id }, {
                        onSuccess: () => setTarget(null),
                    })}
                    onCancel={() => {
                        unlinkSession.reset();
                        setTarget(null);
                    }}
                    isPending={unlinkSession.isPending}
                    error={unlinkSession.isError
                        ? getStatus(unlinkSession.error) === 403
                            ? 'No tienes permiso para desvincular esta sesión.'
                            : 'No se pudo desvincular la sesión.'
                        : undefined}
                />
            )}
        </div>
    );
}
