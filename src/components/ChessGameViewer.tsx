import { useId, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';

function readGame(pgn: string) {
    if (!pgn.trim()) return undefined;

    try {
        const chess = new Chess();
        chess.loadPgn(pgn);
        const moves = chess.history({ verbose: true });
        return { initialPosition: moves[0]?.before ?? chess.fen(), moves };
    } catch {
        return undefined;
    }
}

export function ChessGameViewer({ pgn }: { pgn: string }) {
    return <GamePlayback key={pgn} pgn={pgn} />;
}

function GamePlayback({ pgn }: { pgn: string }) {
    const boardId = useId();
    const game = useMemo(() => readGame(pgn), [pgn]);
    const [ply, setPly] = useState(0);
    const [orientation, setOrientation] = useState<'white' | 'black'>('white');

    if (!game) {
        return <Alert variant="destructive">No se pudo interpretar el PGN de esta partida.</Alert>;
    }

    const { initialPosition, moves } = game;
    const position = moves[ply - 1]?.after ?? initialPosition;

    return (
        <div className="@container min-w-0">
            <div className="grid min-w-0 gap-4 @min-[44rem]:grid-cols-[minmax(0,1fr)_minmax(16rem,1fr)]">
                <div className="mx-auto w-full min-w-0 max-w-lg">
                    <Chessboard options={{
                        id: boardId,
                        position,
                        boardOrientation: orientation,
                        allowDragging: false,
                        allowDrawingArrows: false,
                        lightSquareStyle: { backgroundColor: '#f4e7dc' },
                        darkSquareStyle: { backgroundColor: '#a56862' },
                    }} />
                </div>

                <div className="min-w-0 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" onClick={() => setPly(0)} disabled={ply === 0}>Inicio</Button>
                        <Button variant="secondary" onClick={() => setPly(ply - 1)} disabled={ply === 0}>Anterior</Button>
                        <Button variant="secondary" onClick={() => setPly(ply + 1)} disabled={ply === moves.length}>Siguiente</Button>
                        <Button variant="secondary" onClick={() => setPly(moves.length)} disabled={ply === moves.length}>Final</Button>
                        <Button
                            variant="secondary"
                            className="col-span-2"
                            onClick={() => setOrientation(orientation === 'white' ? 'black' : 'white')}
                            aria-pressed={orientation === 'black'}
                        >
                            Girar tablero
                        </Button>
                    </div>
                    {moves.length === 0 ? (
                        <p className="text-sm text-muted">Esta partida no tiene jugadas.</p>
                    ) : (
                        <ol aria-label="Línea principal" className="flex max-h-64 flex-wrap gap-2 overflow-y-auto rounded-lg border border-border p-2">
                            {moves.map((move, index) => {
                                const moveNumber = move.before.split(' ')[5];
                                const notation = `${moveNumber}${move.color === 'w' ? '.' : '...'} ${move.san}`;
                                return (
                                    <li key={index}>
                                        <Button
                                            variant={ply === index + 1 ? 'primary' : 'secondary'}
                                            className="min-h-10 font-mono text-sm"
                                            aria-current={ply === index + 1 ? 'step' : undefined}
                                            onClick={() => setPly(index + 1)}
                                        >
                                            {notation}
                                        </Button>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </div>
            </div>
        </div>
    );
}
