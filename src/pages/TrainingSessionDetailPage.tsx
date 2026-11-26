import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Pencil, Trash2 } from 'lucide-react';
import {
    getGetTrainingSessionQueryKey,
    getListTrainingSessionsQueryKey,
    useDeleteTrainingSession,
    useGetTrainingSession,
    useUpdateTrainingSession,
} from '../api/generated/training-sessions/training-sessions';
import type { TrainingSessionDetailResource, TrainingSessionList } from '../api/generated/models';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EditableTrainingGames } from '../features/training-sessions/TrainingGames';
import { TrainingSessionForm } from '../features/training-sessions/TrainingSessionForm';
import { trainingCategoryLabels } from '../features/training-sessions/trainingSessionLabels';

function getStatus(error: unknown) {
    return isAxiosError(error) ? error.response?.status : undefined;
}

function TrainingSessionDetail({ id }: { id: number }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const deleted = useRef(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const detailKey = getGetTrainingSessionQueryKey(id);
    const listKey = getListTrainingSessionsQueryKey();
    const sessionQuery = useGetTrainingSession(id, { query: { retry: false } });
    const updateSession = useUpdateTrainingSession({
        mutation: {
            onSuccess: async (updated) => {
                await queryClient.cancelQueries({ queryKey: detailKey, exact: true });
                queryClient.setQueryData<TrainingSessionDetailResource>(detailKey, (detail) => ({
                    data: { ...updated.data, games: detail?.data.games ?? [] },
                }));
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: detailKey, exact: true }),
                    queryClient.invalidateQueries({ queryKey: listKey }),
                ]);
            },
        },
    });
    const deleteSession = useDeleteTrainingSession({
        mutation: {
            onSuccess: async () => {
                queryClient.removeQueries({ queryKey: detailKey, exact: true, type: 'inactive' });
                queryClient.setQueryData<TrainingSessionList>(listKey, (list) =>
                    list && { data: list.data.filter((session) => session.id !== id) },
                );
                await queryClient.invalidateQueries({ queryKey: listKey });
            },
        },
    });

    useEffect(() => {
        return () => {
            // Clear the detail after the route unmounts so its observer cannot recreate it.
            if (deleted.current) {
                queryClient.removeQueries({ queryKey: getGetTrainingSessionQueryKey(id), exact: true });
            }
        };
    }, [id, queryClient]);

    if (sessionQuery.isPending) {
        return <p role="status" className="text-sm text-muted">Cargando sesión...</p>;
    }

    if (sessionQuery.isError) {
        const status = getStatus(sessionQuery.error);
        return (
            <Alert variant="destructive">
                {status === 403
                    ? 'No tienes permiso para ver esta sesión.'
                    : status === 404
                        ? 'La sesión no existe.'
                        : 'No se pudo cargar la sesión.'}
            </Alert>
        );
    }

    const { data: session } = sessionQuery.data;
    const { resource } = session;
    const deleteStatus = getStatus(deleteSession.error);
    const deleteError = deleteSession.isError
        ? deleteStatus === 409
            ? 'La sesión está vinculada a un workspace o tiene respuestas.'
            : deleteStatus === 403
                ? 'No tienes permiso para eliminar esta sesión.'
                : 'No se pudo eliminar la sesión.'
        : undefined;

    return (
        <>
            <Card className="space-y-5">
                <div className="grid gap-5 @min-[48rem]:grid-cols-[minmax(0,1fr)_auto] @min-[48rem]:items-start">
                    <div className="min-w-0">
                        <h1 className="text-3xl font-bold tracking-tight wrap-anywhere text-primary sm:text-4xl">
                            {session.title}
                        </h1>
                        <Badge className="mt-3">{trainingCategoryLabels[session.category]}</Badge>
                    </div>

                    <div className="grid gap-2 @min-[29rem]:flex @min-[29rem]:flex-wrap">
                        <Button variant="secondary" className="flex items-center justify-center gap-2" onClick={() => setShowEditForm(true)}>
                            <Pencil size={18} aria-hidden="true" />
                            Editar sesión
                        </Button>
                        <Button
                            variant="destructive"
                            className="flex items-center justify-center gap-2"
                            disabled={updateSession.isPending}
                            onClick={() => setShowDeleteDialog(true)}
                        >
                            <Trash2 size={18} aria-hidden="true" />
                            Eliminar sesión
                        </Button>
                    </div>
                </div>

                <dl className="grid gap-4 text-sm">
                    <div>
                        <dt className="font-semibold">Descripción</dt>
                        <dd className="mt-1 wrap-anywhere whitespace-pre-wrap text-muted">{session.description || 'Sin descripción'}</dd>
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

            {showEditForm && (
                <TrainingSessionForm
                    session={session}
                    onSave={(data) => updateSession.mutate({ trainingSession: id, data }, {
                        onSuccess: () => setShowEditForm(false),
                    })}
                    onCancel={() => {
                        updateSession.reset();
                        setShowEditForm(false);
                    }}
                    isPending={updateSession.isPending}
                    error={updateSession.error}
                />
            )}

            <EditableTrainingGames sessionId={id} games={session.games} />

            {showDeleteDialog && (
                <ConfirmDialog
                    title="Eliminar sesión"
                    description="Esta acción no se puede deshacer."
                    onConfirm={() => deleteSession.mutate({ trainingSession: id }, {
                        onSuccess: () => {
                            deleted.current = true;
                            navigate('/training-sessions', { replace: true });
                        },
                    })}
                    onCancel={() => {
                        deleteSession.reset();
                        setShowDeleteDialog(false);
                    }}
                    isPending={deleteSession.isPending}
                    error={deleteError}
                />
            )}
        </>
    );
}

export function TrainingSessionDetailPage() {
    const { id } = useParams();
    const sessionId = Number(id);
    const validId = Number.isSafeInteger(sessionId) && sessionId > 0;

    return (
        <div className="@container mx-auto max-w-6xl space-y-6">
            <Link to="/training-sessions" className="inline-flex min-h-10 items-center rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
                Volver a sesiones
            </Link>
            {validId
                ? <TrainingSessionDetail key={sessionId} id={sessionId} />
                : <Alert variant="destructive">Sesión inválida.</Alert>}
        </div>
    );
}
