import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { expect, test, vi } from 'vitest';
import { getGetWorkspaceTrainingSessionQueryKey } from '../api/generated/workspace-training-sessions/workspace-training-sessions';
import { renderWithProviders } from '../test/renderWithProviders';
import { Route, Routes } from 'react-router';
import { TrainingSessionDetailPage } from './TrainingSessionDetailPage';
import { WorkspaceTrainingSessionDetailPage } from './WorkspaceTrainingSessionDetailPage';
import { server } from '../test/mocks/server';

const ownPath = '/training-sessions/7';
const linkedPath = '/workspaces/1/training-sessions/7';
const api = import.meta.env.VITE_API_URL;
const pgn = '  [Event "Club"]\n\n1. e4 {Comentario} (1. d4 d5) e5 *\n';
const game = { id: 12, training_session_id: 7, pgn };
const otherGame = { ...game, id: 13, pgn: '1. c4 *' };
const session = { id: 7, user_id: 1, title: 'Finales', category: 'endgame' };

function renderDetail(path = ownPath) {
    return renderWithProviders(
        <Routes>
            <Route path="/training-sessions/:id" element={<TrainingSessionDetailPage />} />
            <Route path="/workspaces/:workspaceId/training-sessions/:sessionId" element={<WorkspaceTrainingSessionDetailPage />} />
        </Routes>,
        path,
    );
}

test('adds the original PGN and refreshes the owning and linked details', async () => {
    let games: typeof game[] = [];
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    const create = vi.fn();
    server.use(
        http.get(api + ownPath, () => HttpResponse.json({ data: { ...session, games } })),
        http.post(api + ownPath + '/games', async ({ request }) => {
            create(await request.json());
            await pending;
            games = [game];
            return HttpResponse.json({ data: game }, { status: 201 });
        }),
    );
    const { queryClient } = renderDetail();
    const linkedKey = getGetWorkspaceTrainingSessionQueryKey(1, 7);
    const unrelatedKey = getGetWorkspaceTrainingSessionQueryKey(1, 8);
    queryClient.setQueryData(linkedKey, { data: { ...session, games } });
    queryClient.setQueryData(unrelatedKey, { data: { ...session, games } });

    const user = userEvent.setup();
    const input = await screen.findByRole('textbox', { name: 'PGN' });
    expect(screen.getByText('Todavía no hay partidas.')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: pgn } });
    try {
        await user.click(screen.getByRole('button', { name: 'Añadir partida' }));
        expect(screen.getByRole('button', { name: 'Añadiendo partida...' })).toBeDisabled();
        expect(input).toBeDisabled();
    } finally {
        finish();
    }

    expect((await screen.findByText(/Comentario/, { selector: 'pre' })).textContent).toBe(pgn);
    await waitFor(() => expect(input).toHaveValue(''));
    expect(create).toHaveBeenCalledExactlyOnceWith({ pgn });
    expect(queryClient.getQueryState(linkedKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(unrelatedKey)?.isInvalidated).toBe(false);
});

test('reports missing and invalid PGN and preserves the rejected draft', async () => {
    const create = vi.fn(() => HttpResponse.json({
        errors: { pgn: ['La línea principal no es válida.'] },
    }, { status: 422 }));
    server.use(
        http.get(api + ownPath, () => HttpResponse.json({ data: { ...session, games: [] } })),
        http.post(api + ownPath + '/games', create),
    );
    renderDetail();
    const user = userEvent.setup();
    const input = await screen.findByRole('textbox', { name: 'PGN' });
    const submit = screen.getByRole('button', { name: 'Añadir partida' });
    await user.click(submit);
    expect(screen.getByText('Introduce el PGN de la partida.')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();

    await user.type(input, 'PGN incorrecto');
    await user.click(submit);
    expect(await screen.findByText('La línea principal no es válida.')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveValue('PGN incorrecto');
});

test('deletes only the selected game after confirmation and keeps it on failure', async () => {
    let games = [game, otherGame];
    const remove = vi.fn()
        .mockImplementationOnce(() => new HttpResponse(null, { status: 500 }))
        .mockImplementationOnce(() => {
            games = [game];
            return new HttpResponse(null, { status: 204 });
        });
    server.use(
        http.get(api + ownPath, () => HttpResponse.json({ data: { ...session, games } })),
        http.delete(api + ownPath + '/games/13', remove),
    );
    const { queryClient } = renderDetail();
    const linkedKey = getGetWorkspaceTrainingSessionQueryKey(2, 7);
    queryClient.setQueryData(linkedKey, { data: { ...session, games } });
    const user = userEvent.setup();
    const button = await screen.findByRole('button', { name: 'Eliminar partida 2' });
    await user.click(button);
    const dialog = screen.getByRole('dialog', { name: 'Eliminar partida' });
    expect(remove).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    await user.click(button);
    await user.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));
    expect(await screen.findByText('No se pudo eliminar la partida.')).toBeInTheDocument();
    expect(screen.getByText('1. c4 *')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText('1. c4 *')).not.toBeInTheDocument();
    expect(screen.getByText(/Comentario/).textContent).toBe(pgn);
    expect(queryClient.getQueryState(linkedKey)?.isInvalidated).toBe(true);
});

test('shows games in the linked detail without modification controls', async () => {
    server.use(
        http.get(api + '/workspaces/1', () => HttpResponse.json({ data: { id: 1, role: 'owner' } })),
        http.get(api + linkedPath, () => HttpResponse.json({ data: { ...session, games: [game] } })),
        http.get(api + linkedPath + '/responses', () => HttpResponse.json({ data: [] })),
    );
    renderDetail(linkedPath);
    expect((await screen.findByText(/Comentario/, { selector: 'pre' })).textContent).toBe(pgn);
    expect(screen.queryByRole('textbox', { name: 'PGN' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /añadir partida|eliminar partida/i })).not.toBeInTheDocument();
});
