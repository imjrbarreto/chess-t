import { useState } from 'react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import {
    getListTrainingSessionsQueryKey,
    useCreateTrainingSession,
    useListTrainingSessions,
} from '../api/generated/training-sessions/training-sessions';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { TrainingSessionForm } from '../features/training-sessions/TrainingSessionForm';
import { trainingCategoryLabels, trainingCategoryVariants } from '../features/training-sessions/trainingSessionLabels';

export function TrainingSessionsPage() {
    const queryClient = useQueryClient();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const sessionsQuery = useListTrainingSessions({ query: { retry: false } });
    const createSession = useCreateTrainingSession({
        mutation: {
            onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTrainingSessionsQueryKey() }),
        },
    });
    const sessions = sessionsQuery.data?.data ?? [];

    return (
        <div className="@container mx-auto max-w-6xl space-y-6 sm:space-y-8">
            <header className="grid gap-4 @min-[34rem]:flex @min-[34rem]:items-center @min-[34rem]:justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">Sesiones de entrenamiento</h1>
                {sessionsQuery.isSuccess && !showCreateForm && (
                    <Button className="flex shrink-0 items-center justify-center gap-2" onClick={() => setShowCreateForm(true)}>
                        <Plus size={18} aria-hidden="true" />
                        Crear sesión
                    </Button>
                )}
            </header>

            {showCreateForm && (
                <TrainingSessionForm
                    onSave={(data) => createSession.mutate({ data }, {
                        onSuccess: () => setShowCreateForm(false),
                    })}
                    onCancel={() => {
                        createSession.reset();
                        setShowCreateForm(false);
                    }}
                    isPending={createSession.isPending}
                    error={createSession.error}
                />
            )}

            {sessionsQuery.isPending && <p role="status" className="text-sm text-muted">Cargando sesiones...</p>}
            {sessionsQuery.isError && <Alert variant="destructive">No se pudieron cargar las sesiones.</Alert>}
            {sessionsQuery.isSuccess && (
                sessions.length === 0 ? (
                    <Card>
                        <p className="text-muted">Todavía no tienes sesiones de entrenamiento.</p>
                    </Card>
                ) : (
                    <ul role="list" className="grid gap-4 @min-[34rem]:grid-cols-2 @min-[54rem]:grid-cols-3">
                        {sessions.map((session) => (
                            <li key={session.id} className="min-w-0">
                                <Card className="flex h-full flex-col items-start justify-between gap-4">
                                    <h2 className="text-lg font-semibold wrap-anywhere">
                                        <Link to={`/training-sessions/${session.id}`} className="rounded-sm hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
                                            {session.title}
                                        </Link>
                                    </h2>
                                    <Badge variant={trainingCategoryVariants[session.category]}>
                                        {trainingCategoryLabels[session.category]}
                                    </Badge>
                                </Card>
                            </li>
                        ))}
                    </ul>
                )
            )}
        </div>
    );
}
