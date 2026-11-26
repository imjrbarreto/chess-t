import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ChessboardOptions } from 'react-chessboard';
import { expect, test, vi } from 'vitest';
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
    const first = screen.getByRole('button', { name: 'Inicio' });
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

    await user.click(screen.getByRole('button', { name: '17... e5' }));
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
