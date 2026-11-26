import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';

export type StockfishScore = { kind: 'cp' | 'mate'; value: number };
type Line = { rank: number; depth: number; score: StockfishScore; moves: string[] };
type Request = { fen: string };
type Analysis = {
    request: Request;
    lines: Line[];
    score?: StockfishScore;
    finished?: boolean;
};

function readLine(message: string, fen: string): Line | undefined {
    if (!message.startsWith('info depth ')) return;

    const depth = message.match(/\bdepth (\d+)/);
    const rank = message.match(/\bmultipv ([1-3])\b/);
    const score = message.match(/\bscore (cp|mate) (-?\d+)/);
    const pv = message.match(/\bpv (.+)$/);
    if (!depth || !rank || !score || !pv || /\b(?:lowerbound|upperbound)\b/.test(message)) return;

    const sign = fen.split(' ')[1] === 'b' ? -1 : 1;
    return {
        rank: Number(rank[1]),
        depth: Number(depth[1]),
        score: { kind: score[1] === 'mate' ? 'mate' : 'cp', value: sign * Number(score[2]) },
        moves: pv[1].trim().split(/\s+/),
    };
}

function createEngine(report: (analysis: Analysis) => void, onError: () => void) {
    let worker: Worker | undefined;
    let disposed = false;
    let ready = false;
    let stopping = false;
    let requested: Request | undefined;
    let active: Request | undefined;
    const lines = new Map<number, Line>();

    function dispose() {
        disposed = true;
        worker?.terminate();
        worker = undefined;
    }

    function fail() {
        if (disposed) return;
        dispose();
        onError();
    }

    function start() {
        if (!worker || !ready || active || !requested) return;

        active = requested;
        lines.clear();
        worker.postMessage(`position fen ${active.fen}`);
        worker.postMessage('go depth 16');
    }

    function publish(request: Request, finished = false) {
        let score = lines.get(1)?.score;
        if (finished && !score) {
            const position = new Chess(request.fen);
            if (position.isCheckmate()) {
                score = { kind: 'mate', value: position.turn() === 'w' ? -0 : 0 };
            } else if (position.isDraw()) {
                score = { kind: 'cp', value: 0 };
            }
        }
        report({
            request,
            lines: [...lines.values()].sort((a, b) => a.rank - b.rank),
            score,
            finished,
        });
    }

    function handleMessage(event: MessageEvent) {
        if (!worker || typeof event.data !== 'string') return;
        const message = event.data.trim();

        if (message === 'uciok') {
            worker.postMessage('setoption name MultiPV value 3');
            worker.postMessage('isready');
        } else if (message === 'readyok') {
            ready = true;
            start();
        } else if (message.startsWith('bestmove ') && active) {
            const completed = active;
            if (!stopping) publish(completed, true);
            active = undefined;
            stopping = false;
            // UCI ends every search, including one interrupted with stop, with bestmove.
            if (requested !== completed) start();
        } else if (active && !stopping) {
            const line = readLine(message, active.fen);
            if (line) {
                lines.set(line.rank, line);
                publish(active);
            }
        }
    }

    void Promise.all([
        import('stockfish/bin/stockfish-19-lite-single.js?url&no-inline'),
        import('stockfish/bin/stockfish-19-lite-single.wasm?url&no-inline'),
    ]).then(([script, wasm]) => {
        if (disposed) return;
        // The classic Stockfish worker reads the WASM URL from its URL fragment.
        const wasmUrl = new URL(wasm.default, document.baseURI);
        worker = new Worker(`${script.default}#${encodeURIComponent(wasmUrl.href)}`);
        worker.onmessage = handleMessage;
        worker.onerror = fail;
        worker.onmessageerror = fail;
        worker.postMessage('uci');
    }).catch(fail);

    return {
        analyze(request: Request | undefined) {
            requested = request;
            if (active && !stopping) {
                stopping = true;
                worker?.postMessage('stop');
            }
            start();
        },
        dispose,
    };
}

export function useStockfish(fen: string | undefined, enabled: boolean) {
    const session = useMemo(() => enabled ? {} : undefined, [enabled]);
    const request = useMemo(() => enabled && fen ? { fen } : undefined, [enabled, fen]);
    const engine = useRef<ReturnType<typeof createEngine>>(undefined);
    const [analysis, setAnalysis] = useState<Analysis>();
    const [failedSession, setFailedSession] = useState<typeof session>();

    useEffect(() => {
        if (!session) return;
        const instance = createEngine(setAnalysis, () => setFailedSession(session));
        engine.current = instance;
        return () => {
            instance.dispose();
            engine.current = undefined;
        };
    }, [session]);

    useEffect(() => {
        engine.current?.analyze(request);
    }, [request]);

    return {
        analysis: request && analysis?.request === request ? analysis : undefined,
        error: session !== undefined && session === failedSession,
    };
}
