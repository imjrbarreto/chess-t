import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ChessboardOptions } from 'react-chessboard';
import { afterEach, expect, test, vi } from 'vitest';
import { TrainingGames } from '../features/training-sessions/TrainingGames';
import { ChessGameViewer } from './ChessGameViewer';

vi.mock('react-chessboard', () => ({
    Chessboard: ({ options }: { options: ChessboardOptions }) => (
        <div
            data-testid="tablero"
            data-position={options.position}
            data-orientation={options.boardOrientation}
            data-draggable={options.allowDragging}
        />
    ),
}));

const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const afterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const afterE5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const fen = '4k3/4p3/8/8/8/8/4P3/4K3 b - - 0 17';
const customPgn = `[SetUp "1"]\n[FEN "${fen}"]\n\n17... e5 *`;

test('navigates the mainline and allows selecting a move and flipping the board', async () => {
    const user = userEvent.setup();
    render(<ChessGameViewer pgn="1. e4 {Comentario} (1. d4 d5) e5 2. Nf3 *" />);
    const board = screen.getByTestId('tablero');
    const controls = within(screen.getByRole('group', { name: 'Controles del tablero' }));
    const first = controls.getByRole('button', { name: 'Inicio' });
    const previous = screen.getByRole('button', { name: 'Anterior' });
    const next = screen.getByRole('button', { name: 'Siguiente' });
    const last = screen.getByRole('button', { name: 'Final' });

    expect(board).toHaveAttribute('data-position', start);
    expect(board).toHaveAttribute('data-draggable', 'false');
    expect(first).toBeDisabled();
    expect(previous).toBeDisabled();
    expect(screen.queryByRole('button', { name: '1. d4' })).not.toBeInTheDocument();

    await user.click(next);
    expect(board).toHaveAttribute('data-position', afterE4);
    await user.click(last);
    expect(next).toBeDisabled();
    expect(last).toBeDisabled();
    expect(screen.getByRole('button', { name: '2. Nf3' })).toHaveAttribute('aria-current', 'step');

    await user.click(previous);
    expect(board).toHaveAttribute('data-position', afterE5);
    await user.click(first);
    expect(board).toHaveAttribute('data-position', start);
    await user.click(screen.getByRole('button', { name: '1... e5' }));
    expect(board).toHaveAttribute('data-position', afterE5);

    await user.click(screen.getByRole('button', { name: 'Girar tablero' }));
    expect(board).toHaveAttribute('data-orientation', 'black');
    expect(board).toHaveAttribute('data-position', afterE5);
});

test('uses the PGN FEN, including the side to move and move number', async () => {
    const user = userEvent.setup();
    render(<ChessGameViewer pgn={customPgn} />);
    const board = screen.getByTestId('tablero');
    expect(board).toHaveAttribute('data-position', fen);
    const notation = within(screen.getByRole('table', { name: 'Línea principal' }));
    expect(notation.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['N.º', 'Blancas', 'Negras']);
    const [, firstRow] = notation.getAllByRole('row');
    const [number, white, black] = within(firstRow).getAllByRole('cell');
    expect(number).toHaveTextContent('17.');
    expect(white).toBeEmptyDOMElement();
    expect(black).toHaveTextContent('e5');

    await user.click(within(black).getByRole('button', { name: '17... e5' }));
    expect(board).toHaveAttribute('data-position', '4k3/8/8/4p3/8/8/4P3/4K3 w - - 0 18');
    await user.click(screen.getByRole('button', { name: 'Inicio' }));
    expect(board).toHaveAttribute('data-position', fen);
});

test('starts at the initial position when selecting another session game', async () => {
    const user = userEvent.setup();
    render(<TrainingGames games={[
        { id: 1, training_session_id: 7, pgn: '1. e4 e5 *' },
        { id: 2, training_session_id: 7, pgn: customPgn },
    ]} />);
    await user.click(screen.getByRole('button', { name: 'Final' }));
    expect(screen.getByTestId('tablero')).toHaveAttribute('data-position', afterE5);

    const picker = screen.getByRole('combobox', { name: 'Seleccionar partida' });
    await user.selectOptions(picker, '2');
    expect(screen.getByTestId('tablero')).toHaveAttribute('data-position', fen);
    expect(screen.getByRole('button', { name: '17... e5' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '1. e4' })).not.toBeInTheDocument();

    await user.selectOptions(picker, '1');
    expect(screen.getByTestId('tablero')).toHaveAttribute('data-position', start);
});

test('shows an error when the PGN cannot be interpreted', () => {
    render(<ChessGameViewer pgn="1. e5 *" />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo interpretar el PGN');
    expect(screen.queryByTestId('tablero')).not.toBeInTheDocument();
});

class MockWorker {
    onmessage?: (event: MessageEvent<string>) => void;
    onerror?: () => void;
    postMessage = vi.fn<(command: string) => void>();
    terminate = vi.fn();

    emit(...messages: string[]) {
        act(() => {
            for (const data of messages) this.onmessage?.(new MessageEvent('message', { data }));
        });
    }
}

function mockWorkers() {
    const workers: MockWorker[] = [];
    vi.stubGlobal('Worker', class extends MockWorker {
        constructor() {
            super();
            workers.push(this);
        }
    });
    return workers;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

test('starts Stockfish on demand and displays three lines from the perspective of White', async () => {
    const workers = mockWorkers();
    const user = userEvent.setup();
    const { unmount } = render(<ChessGameViewer pgn={customPgn} allowEngine />);
    const toggle = screen.getByRole('button', { name: 'Motor Stockfish' });
    expect(workers).toHaveLength(0);

    await user.click(toggle);
    await waitFor(() => expect(workers).toHaveLength(1));
    const [worker] = workers;
    expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith('uci');
    worker.emit('uciok', 'readyok');
    expect(worker.postMessage.mock.calls.flat()).toEqual([
        'uci', 'setoption name MultiPV value 3', 'isready', `position fen ${fen}`, 'go depth 16',
    ]);

    worker.emit(
        'info depth 10 multipv 3 score cp -25 pv e8d7',
        'info depth 10 multipv 1 score cp 125 pv e7e5 e2e4',
        'info depth 10 multipv 2 score mate -3 pv e7e6',
        'info depth 11 multipv 1 score cp 999 lowerbound pv e7e5',
        'bestmove e7e5',
    );

    expect(screen.getByText('Profundidad 10')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Barra de evaluación: -1,25 para blancas' })).toBeInTheDocument();
    const lines = within(screen.getByRole('list', { name: 'Líneas de Stockfish' })).getAllByRole('listitem');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toHaveTextContent('17... e5 18. e4');
    expect(lines[1]).toHaveTextContent('+M3');
    expect(lines[2]).toHaveTextContent('+0,25');

    await user.click(screen.getByRole('button', { name: 'Girar tablero' }));
    expect(worker.postMessage).toHaveBeenCalledTimes(5);
    expect(screen.getByText('Profundidad 10')).toBeInTheDocument();

    await user.click(toggle);
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(screen.queryByRole('region', { name: 'Análisis de Stockfish' })).not.toBeInTheDocument();

    await user.click(toggle);
    await waitFor(() => expect(workers).toHaveLength(2));
    unmount();
    expect(workers[1].terminate).toHaveBeenCalledOnce();
});

test('discards an interrupted search and analyzes only the latest position', async () => {
    const workers = mockWorkers();
    const user = userEvent.setup();
    render(<ChessGameViewer pgn="1. e4 e5 *" allowEngine />);
    await user.click(screen.getByRole('button', { name: 'Motor Stockfish' }));
    await waitFor(() => expect(workers).toHaveLength(1));
    const [worker] = workers;
    worker.emit('uciok', 'readyok', 'info depth 5 multipv 1 score cp 30 pv e2e4');
    expect(screen.getByText('Profundidad 5')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Final' }));
    expect(worker.postMessage.mock.calls.flat().slice(3)).toEqual([`position fen ${start}`, 'go depth 16', 'stop']);
    expect(screen.queryByText('Profundidad 5')).not.toBeInTheDocument();

    worker.emit('info depth 6 multipv 1 score cp 40 pv d2d4', 'bestmove d2d4');
    expect(screen.queryByText('Profundidad 6')).not.toBeInTheDocument();
    expect(worker.postMessage).not.toHaveBeenCalledWith(`position fen ${afterE4}`);
    expect(worker.postMessage.mock.calls.flat().slice(-2)).toEqual([`position fen ${afterE5}`, 'go depth 16']);

    worker.emit('info depth 8 multipv 1 score cp 60 pv g1f3', 'bestmove g1f3');
    expect(screen.getByText('Profundidad 8')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Barra de evaluación: +0,60 para blancas' })).toBeInTheDocument();
});

test('keeps the engine unavailable by default', async () => {
    const workers = mockWorkers();
    const user = userEvent.setup();
    render(<ChessGameViewer pgn={customPgn} />);
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.queryByRole('button', { name: 'Motor Stockfish' })).not.toBeInTheDocument();
    expect(workers).toHaveLength(0);
});
