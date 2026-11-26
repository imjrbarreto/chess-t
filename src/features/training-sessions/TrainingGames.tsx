import { useId, useState } from 'react';
import type { ReactNode, SubmitEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import type { TrainingGame, ValidationError } from '../../api/generated/models';
import { useCreateTrainingGame, useDeleteTrainingGame } from '../../api/generated/training-games/training-games';
import { getGetTrainingSessionQueryKey } from '../../api/generated/training-sessions/training-sessions';
import { ChessGameViewer } from '../../components/ChessGameViewer';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Select } from '../../components/ui/Select';

const maxPgnLength = 50_000;

export function TrainingGames({
    games = [],
    children,
    renderActions,
}: {
    games?: TrainingGame[];
    children?: ReactNode;
    renderActions?: (game: TrainingGame, index: number) => ReactNode;
}) {
    const selectId = useId();
    const [selectedId, setSelectedId] = useState<number>();
    const selectedGame = games.find((game) => game.id === selectedId) ?? games[0];

    return (
        <Card className="@container min-w-0 space-y-5">
            <h2 className="text-xl font-semibold tracking-tight">Partidas</h2>

            {selectedGame && (
                <>
                    <Select
                        id={selectId}
                        label="Seleccionar partida"
                        value={selectedGame.id}
                        onChange={(event) => setSelectedId(Number(event.target.value))}
                    >
                        {games.map((game, index) => (
                            <option key={game.id} value={game.id}>Partida {index + 1}</option>
                        ))}
                    </Select>
                    <ChessGameViewer key={selectedGame.id} pgn={selectedGame.pgn} />
                </>
            )}

            {games.length === 0 ? (
                <p className="text-sm text-muted">Todavía no hay partidas.</p>
            ) : (
                <ul className="space-y-3">
                    {games.map((game, index) => (
                        <li key={game.id} className="min-w-0 rounded-lg border border-border p-4">
                            <div className="grid gap-2 @min-[22rem]:flex @min-[22rem]:items-center @min-[22rem]:justify-between">
                                <h3 className="text-sm font-semibold">Partida {index + 1}</h3>
                                {renderActions?.(game, index)}
                            </div>
                            <details className="mt-3 text-sm text-muted">
                                <summary className="cursor-pointer">Ver PGN original</summary>
                                <pre className="mt-2 wrap-anywhere whitespace-pre-wrap">{game.pgn}</pre>
                            </details>
                        </li>
                    ))}
                </ul>
            )}

            {children}
        </Card>
    );
}

export function EditableTrainingGames({ sessionId, games }: { sessionId: number; games?: TrainingGame[] }) {
    const queryClient = useQueryClient();
    const inputId = useId();
    const [pgn, setPgn] = useState('');
    const [validationError, setValidationError] = useState<string>();
    const [gameToDelete, setGameToDelete] = useState<{ id: number; number: number }>();

    async function invalidateDetails() {
        const ownDetail = getGetTrainingSessionQueryKey(sessionId)[0];
        const linkedDetail = new RegExp(`^/workspaces/\\d+/training-sessions/${sessionId}$`);
        await queryClient.invalidateQueries({
            predicate: ({ queryKey: [url, ...rest] }) =>
                rest.length === 0 && typeof url === 'string' && (url === ownDetail || linkedDetail.test(url)),
        });
    }

    const createGame = useCreateTrainingGame({ mutation: { onSuccess: invalidateDetails } });
    const deleteGame = useDeleteTrainingGame({ mutation: { onSuccess: invalidateDetails } });
    const isPending = createGame.isPending || deleteGame.isPending;
    const response = isAxiosError<ValidationError>(createGame.error) ? createGame.error.response : undefined;
    const pgnError = validationError ?? (response?.status === 422
        ? response.data?.errors?.pgn?.[0] ?? 'Revisa el PGN de la partida.'
        : undefined);

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isPending) return;

        if (!pgn.trim()) {
            setValidationError('Introduce el PGN de la partida.');
            return;
        }

        if (pgn.length > maxPgnLength) {
            setValidationError('El PGN debe tener como máximo 50.000 caracteres.');
            return;
        }

        createGame.mutate({ trainingSession: sessionId, data: { pgn } }, {
            onSuccess: () => setPgn(''),
        });
    }

    return (
        <TrainingGames games={games} renderActions={(game, index) => (
            <Button
                variant="destructive"
                aria-label={`Eliminar partida ${index + 1}`}
                disabled={createGame.isPending}
                onClick={() => setGameToDelete({ id: game.id, number: index + 1 })}
            >
                Eliminar partida
            </Button>
        )}>
            <form className="grid gap-3" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor={inputId} className="text-sm font-medium">PGN</label>
                    <textarea
                        id={inputId}
                        name="pgn"
                        rows={5}
                        value={pgn}
                        disabled={isPending}
                        aria-invalid={Boolean(pgnError)}
                        aria-describedby={pgnError ? `${inputId}-error` : undefined}
                        className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-invalid:border-destructive"
                        onChange={(event) => {
                            setPgn(event.target.value);
                            setValidationError(undefined);
                            if (createGame.isError) createGame.reset();
                        }}
                    />
                    {pgnError && (
                        <p id={`${inputId}-error`} role="alert" className="text-sm text-destructive">{pgnError}</p>
                    )}
                </div>

                {createGame.isError && response?.status !== 422 && (
                    <Alert variant="destructive">
                        {response?.status === 403
                            ? 'No tienes permiso para añadir partidas a esta sesión.'
                            : 'No se pudo añadir la partida.'}
                    </Alert>
                )}

                <Button type="submit" className="@min-[22rem]:justify-self-end" disabled={isPending}>
                    {createGame.isPending ? 'Añadiendo partida...' : 'Añadir partida'}
                </Button>
            </form>

            {gameToDelete && (
                <ConfirmDialog
                    title="Eliminar partida"
                    description={`Se eliminará la partida ${gameToDelete.number} de la sesión.`}
                    isPending={deleteGame.isPending}
                    error={deleteGame.isError ? 'No se pudo eliminar la partida.' : undefined}
                    onConfirm={() => {
                        if (isPending) return;
                        deleteGame.mutate({ trainingSession: sessionId, game: gameToDelete.id }, {
                            onSuccess: () => setGameToDelete(undefined),
                        });
                    }}
                    onCancel={() => {
                        deleteGame.reset();
                        setGameToDelete(undefined);
                    }}
                />
            )}
        </TrainingGames>
    );
}
