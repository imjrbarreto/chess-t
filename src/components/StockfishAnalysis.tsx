import { Chess } from 'chess.js';
import type { StockfishScore, useStockfish } from '../hooks/useStockfish';
import { Alert } from './ui/Alert';

function blackIsWinning(score: StockfishScore) {
    return score.value < 0 || Object.is(score.value, -0);
}

const evaluationFormat = new Intl.NumberFormat('es', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
});

function formatScore(score: StockfishScore) {
    if (score.kind === 'mate') {
        return `${blackIsWinning(score) ? '−' : '+'}M${Math.abs(score.value)}`;
    }
    return evaluationFormat.format(score.value / 100);
}

function principalVariation(fen: string, moves: string[]) {
    const position = new Chess(fen);
    const notation: string[] = [];

    for (const move of moves) {
        const number = position.moveNumber();
        const color = position.turn();
        const { san } = position.move({
            from: move.slice(0, 2),
            to: move.slice(2, 4),
            promotion: move[4],
        });
        if (color === 'w') notation.push(`${number}. ${san}`);
        else notation.push(notation.length === 0 ? `${number}... ${san}` : san);
    }

    return notation.join(' ');
}

export function StockfishEvaluationBar({
    score,
    orientation,
}: {
    score?: StockfishScore;
    orientation: 'white' | 'black';
}) {
    const whiteShare = score?.kind === 'mate'
        ? (blackIsWinning(score) ? 0 : 100)
        : 50 + 50 * Math.tanh((score?.value ?? 0) / 400);

    return (
        <div
            role="img"
            aria-label={score ? `Barra de evaluación: ${formatScore(score)} para blancas` : 'Barra de evaluación pendiente'}
            className="absolute inset-0 overflow-hidden rounded-full border border-border bg-gray-900"
        >
            <div
                className={`absolute inset-x-0 bg-surface ${orientation === 'white' ? 'bottom-0' : 'top-0'}`}
                style={{ height: `${whiteShare}%` }}
            />
        </div>
    );
}

export function StockfishAnalysis({
    fen,
    analysis,
    error,
}: { fen: string } & ReturnType<typeof useStockfish>) {
    if (error) return <Alert variant="destructive">No se pudo iniciar o ejecutar Stockfish.</Alert>;

    const score = analysis?.score;
    const depth = analysis?.lines[0]?.depth;
    return (
        <section aria-label="Análisis de Stockfish" className="min-w-0 space-y-2 rounded-lg border border-border p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                <span>Evaluación de blancas</span>
                <strong className="tabular-nums">{score ? formatScore(score) : '—'}</strong>
            </div>
            {depth !== undefined && <p className="text-muted">Profundidad {depth}</p>}
            {analysis?.lines.length ? (
                <ol aria-label="Líneas de Stockfish" className="max-h-44 space-y-2 overflow-y-auto overscroll-y-contain">
                    {analysis.lines.map((line) => (
                        <li key={line.rank} className="flex items-baseline gap-2 border-t border-border pt-2">
                            <span className="shrink-0 font-semibold tabular-nums">{formatScore(line.score)}</span>
                            <span className="min-w-0 wrap-anywhere">{principalVariation(fen, line.moves)}</span>
                        </li>
                    ))}
                </ol>
            ) : (
                !score && <p className="text-muted" role="status">
                    {analysis?.finished ? 'No hay líneas disponibles.' : 'Analizando posición…'}
                </p>
            )}
        </section>
    );
}
