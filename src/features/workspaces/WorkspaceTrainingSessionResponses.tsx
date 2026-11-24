import { useId, useState } from 'react';
import type { SubmitEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import type { ValidationError } from '../../api/generated/models';
import {
    getListTrainingSessionResponsesQueryKey,
    useCreateTrainingSessionResponse,
    useListTrainingSessionResponses,
} from '../../api/generated/training-session-responses/training-session-responses';
import { useGetWorkspace } from '../../api/generated/workspaces/workspaces';
import { useAuth } from '../../auth/useAuth';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

const maxContentLength = 10_000;

function getSubmissionError(error: unknown) {
    if (isAxiosError<ValidationError>(error)) {
        switch (error.response?.status) {
            case 403: return 'No tienes permiso para enviar una respuesta.';
            case 404: return 'No se encontró la sesión en este workspace.';
            case 422: return error.response.data?.errors?.content?.[0] ?? 'Revisa el contenido de tu respuesta.';
        }
    }
    return 'No se pudo enviar la respuesta.';
}

function Responses({ workspaceId, sessionId }: { workspaceId: number; sessionId: number }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const id = useId();
    const [draft, setDraft] = useState('');
    const workspaceQuery = useGetWorkspace(workspaceId, { query: { retry: false } });
    const responsesQuery = useListTrainingSessionResponses(workspaceId, sessionId, { query: { retry: false } });
    const submitResponse = useCreateTrainingSessionResponse({
        mutation: {
            onSuccess: () => queryClient.invalidateQueries({
                queryKey: getListTrainingSessionResponsesQueryKey(workspaceId, sessionId),
                exact: true,
            }),
        },
    });

    if (responsesQuery.isError) {
        const status = isAxiosError(responsesQuery.error) ? responsesQuery.error.response?.status : undefined;
        return (
            <Alert variant="destructive">
                {status === 403
                    ? 'No tienes permiso para ver las respuestas.'
                    : status === 404
                        ? 'No se encontraron las respuestas de esta sesión.'
                        : 'No se pudieron cargar las respuestas.'}
            </Alert>
        );
    }

    if (workspaceQuery.isError) {
        return <Alert variant="destructive">No se pudieron verificar tus permisos en el workspace.</Alert>;
    }

    if (workspaceQuery.isPending || responsesQuery.isPending) {
        return <p role="status" className="text-sm text-muted">Cargando respuestas...</p>;
    }

    const responses = responsesQuery.data.data;
    const isStudent = workspaceQuery.data.data.role === 'student';
    const hasResponded = responses.some((response) => response.user_id === user?.id);
    const canRespond = Boolean(user && isStudent && !hasResponded && !submitResponse.isSuccess);
    const content = draft.trim();
    const validContent = content.length > 0 && content.length <= maxContentLength;

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canRespond || !validContent || submitResponse.isPending) return;

        submitResponse.mutate({
            workspace: workspaceId,
            trainingSession: sessionId,
            data: { content },
        });
    }

    if (canRespond) {
        const error = submitResponse.isError ? getSubmissionError(submitResponse.error) : undefined;

        return (
            <form className="grid gap-3" onSubmit={handleSubmit}>
                <p id={`${id}-help`} className="text-sm text-muted">
                    Podrás consultar las demás respuestas después de enviar la tuya.
                </p>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor={id} className="text-sm font-medium">Tu respuesta</label>
                    <textarea
                        id={id}
                        value={draft}
                        onChange={(event) => {
                            setDraft(event.currentTarget.value);
                            if (submitResponse.isError) submitResponse.reset();
                        }}
                        rows={4}
                        required
                        maxLength={maxContentLength}
                        disabled={submitResponse.isPending}
                        aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
                        className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                </div>
                {error && <Alert id={`${id}-error`} variant="destructive">{error}</Alert>}
                <Button type="submit" className="sm:justify-self-start" disabled={!validContent || submitResponse.isPending}>
                    {submitResponse.isPending ? 'Enviando respuesta...' : 'Enviar respuesta'}
                </Button>
            </form>
        );
    }

    if (isStudent && !hasResponded && submitResponse.isSuccess) {
        return <p role="status" className="text-sm text-muted">Respuesta enviada.</p>;
    }

    if (responses.length === 0) {
        return <p className="text-sm text-muted">Todavía no hay respuestas.</p>;
    }

    return (
        <ul role="list" className="divide-y divide-border">
            {responses.map((response) => (
                <li key={response.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
                    <p className="wrap-anywhere text-sm font-semibold">
                        {response.user?.name ?? `Usuario #${response.user_id}`}
                    </p>
                    <p className="wrap-anywhere whitespace-pre-wrap text-sm text-muted">{response.content}</p>
                </li>
            ))}
        </ul>
    );
}

export function WorkspaceTrainingSessionResponses({ workspaceId, sessionId }: { workspaceId: number; sessionId: number }) {
    return (
        <Card className="space-y-4">
            <h2 className="text-lg font-semibold">Respuestas</h2>
            <Responses key={`${workspaceId}/${sessionId}`} workspaceId={workspaceId} sessionId={sessionId} />
        </Card>
    );
}
