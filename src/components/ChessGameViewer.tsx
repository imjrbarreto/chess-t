import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { Move } from 'chess.js';
import { ArrowDownUp, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';
import { Chessboard } from 'react-chessboard';
import { useStockfish } from '../hooks/useStockfish';
import { StockfishAnalysis, StockfishEvaluationBar } from './StockfishAnalysis';
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

type MoveCell = { move: Move; ply: number };
type MoveRow = { number: string; w?: MoveCell; b?: MoveCell };

function groupMoves(moves: Move[]) {
    const rows: MoveRow[] = [];
    moves.forEach((move, index) => {
        const number = move.before.split(' ')[5];
        let row = rows.at(-1);
        if (row?.number !== number) {
            row = { number };
            rows.push(row);
        }
        row[move.color] = { move, ply: index + 1 };
    });
    return rows;
}

function MoveList({ moves, ply, onSelect }: { moves: Move[]; ply: number; onSelect: (ply: number) => void }) {
    const rows = useMemo(() => groupMoves(moves), [moves]);
    const list = useRef<HTMLDivElement>(null);
    const activeMove = useRef<HTMLButtonElement>(null);

    useLayoutEffect(() => {
        const viewport = list.current;
        if (!viewport) return;
        if (ply === 0) {
            viewport.scrollTop = 0;
            return;
        }

        const selected = activeMove.current?.getBoundingClientRect();
        if (!selected) return;
        const { top, bottom } = viewport.getBoundingClientRect();
        if (selected.top < top || selected.bottom > bottom) {
            viewport.scrollTop += (selected.top + selected.bottom - top - bottom) / 2;
        }
    }, [ply]);

    if (!rows.length) return <p className="text-sm text-muted">Esta partida no tiene jugadas.</p>;

    return (
        <div role="table" aria-label="Línea principal" className="min-w-0 overflow-hidden rounded-lg border border-border text-sm">
            <div role="row" className="grid grid-cols-[3rem_repeat(2,minmax(0,1fr))] overflow-y-auto bg-background font-semibold [scrollbar-gutter:stable]">
                <span role="columnheader" className="py-2 text-center">N.º</span>
                <span role="columnheader" className="px-3 py-2">Blancas</span>
                <span role="columnheader" className="px-3 py-2">Negras</span>
            </div>
            <div ref={list} role="rowgroup" className="max-h-72 overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]">
                {rows.map(({ number, w, b }) => (
                    <div role="row" key={number} className="grid grid-cols-[3rem_repeat(2,minmax(0,1fr))] items-center border-t border-border">
                        <span role="cell" className="text-center tabular-nums text-muted">{number}.</span>
                        {[w, b].map((cell, index) => (
                            <div role="cell" key={index} className="min-w-0 p-0.5">
                                {cell && (
                                    <Button
                                        ref={ply === cell.ply ? activeMove : undefined}
                                        variant={ply === cell.ply ? 'primary' : 'secondary'}
                                        className="min-h-11 w-full border-transparent! px-2.5! text-left font-mono text-sm"
                                        aria-label={`${number}${cell.move.color === 'w' ? '.' : '...'} ${cell.move.san}`}
                                        aria-current={ply === cell.ply ? 'step' : undefined}
                                        onClick={() => onSelect(cell.ply)}
                                    >
                                        {cell.move.san}
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

type ViewerProps = { pgn: string; allowEngine?: boolean };

export function ChessGameViewer({ pgn, allowEngine }: ViewerProps) {
    return <GamePlayback key={pgn} pgn={pgn} allowEngine={allowEngine} />;
}

function GamePlayback({ pgn, allowEngine = false }: ViewerProps) {
    const boardId = useId();
    const game = useMemo(() => readGame(pgn), [pgn]);
    const [ply, setPly] = useState(0);
    const [orientation, setOrientation] = useState<'white' | 'black'>('white');

    const [engineEnabled, setEngineEnabled] = useState(false);
    const position = game?.moves[ply - 1]?.after ?? game?.initialPosition;
    const analysisEnabled = allowEngine && engineEnabled;
    const engine = useStockfish(position, analysisEnabled);

    if (!game || !position) {
        return <Alert variant="destructive">No se pudo interpretar el PGN de esta partida.</Alert>;
    }

    const { moves } = game;

    const navigation = [
        { label: 'Inicio', icon: ChevronFirst, target: 0 },
        { label: 'Anterior', icon: ChevronLeft, target: Math.max(0, ply - 1) },
        { label: 'Siguiente', icon: ChevronRight, target: Math.min(moves.length, ply + 1) },
        { label: 'Final', icon: ChevronLast, target: moves.length },
    ];

    return (
        <div data-chess-game-viewer className="@container min-w-0">
            <div className="grid min-w-0 items-start gap-4 @min-[40rem]:grid-cols-[minmax(0,3fr)_minmax(15rem,2fr)]">
                <div className="mx-auto w-full min-w-0 max-w-lg space-y-2">
                    <div className={`grid ${allowEngine ? 'grid-cols-[1rem_minmax(0,1fr)] gap-1.5' : 'grid-cols-1'}`}>
                        {allowEngine && (
                            <div className="relative">
                                {analysisEnabled && (
                                    <StockfishEvaluationBar score={engine.analysis?.score} orientation={orientation} />
                                )}
                            </div>
                        )}
                        <div className="relative aspect-square w-full min-w-0 overflow-hidden rounded-md">
                            <div className="absolute inset-0">
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
                        </div>
                    </div>

                    <div role="group" aria-label="Controles del tablero" className="grid grid-cols-5 gap-1.5">
                        {navigation.map(({ label, icon: Icon, target }) => (
                            <Button
                                key={label}
                                variant="secondary"
                                className="flex min-h-11 items-center justify-center px-0!"
                                aria-label={label}
                                title={label}
                                onClick={() => setPly(target)}
                                disabled={ply === target}
                            >
                                <Icon size={20} aria-hidden="true" />
                            </Button>
                        ))}
                        <Button
                            variant={orientation === 'black' ? 'primary' : 'secondary'}
                            className="flex min-h-11 items-center justify-center px-0!"
                            aria-label="Girar tablero"
                            title="Girar tablero"
                            onClick={() => setOrientation(orientation === 'white' ? 'black' : 'white')}
                            aria-pressed={orientation === 'black'}
                        >
                            <ArrowDownUp size={20} aria-hidden="true" />
                        </Button>
                    </div>
                </div>

                <div className="min-w-0 space-y-3">
                    {allowEngine && (
                        <Button
                            variant={analysisEnabled ? 'primary' : 'secondary'}
                            className="min-h-11 w-full"
                            aria-pressed={analysisEnabled}
                            onClick={() => setEngineEnabled((enabled) => !enabled)}
                        >
                            Motor Stockfish
                        </Button>
                    )}
                    {analysisEnabled && <StockfishAnalysis fen={position} {...engine} />}
                    <MoveList moves={moves} ply={ply} onSelect={setPly} />
                </div>
            </div>
        </div>
    );
}
