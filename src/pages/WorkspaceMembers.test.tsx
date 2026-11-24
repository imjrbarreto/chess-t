import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { afterEach, expect, test } from 'vitest';
import App from '../App';
import type { Member, WorkspaceRole } from '../api/generated/models';
import { getListWorkspaceMembersQueryKey } from '../api/generated/workspace-members/workspace-members';
import { getGetWorkspaceQueryKey, getListWorkspacesQueryKey } from '../api/generated/workspaces/workspaces';
import { setAccessToken } from '../auth/session';
import { server } from '../test/mocks/server';
import { renderWithProviders } from '../test/renderWithProviders';

const api = import.meta.env.VITE_API_URL;
const workspaceUrl = `${api}/workspaces/1`;
const membersUrl = `${workspaceUrl}/members`;
const owner = { id: 1, name: 'Ana', email: 'ana@example.com', role: 'owner' } as const;
const student = { id: 2, name: 'Luis', email: 'luis@example.com', role: 'student' } as const;
const viewer = { id: 3, name: 'Eva', email: 'eva@example.com', role: 'viewer' } as const;

afterEach(() => setAccessToken(null));

function renderWorkspace(role: WorkspaceRole = 'owner', members: Member[] = [owner, student]) {
    setAccessToken('test-token');
    const user = role === 'owner' ? owner : student;
    server.use(
        http.get(`${api}/users/me`, () => HttpResponse.json({ data: user })),
        http.get(workspaceUrl, () => HttpResponse.json({
            data: { id: 1, title: 'Club', status: 'active', role },
        })),
        http.get(membersUrl, () => HttpResponse.json({ data: members })),
    );
    return { user: userEvent.setup(), ...renderWithProviders(<App />, '/workspaces/1') };
}

test('switches tabs with the keyboard and lists the owner and members with their roles', async () => {
    const { user } = renderWorkspace();
    const general = await screen.findByRole('tab', { name: 'General', selected: true });
    general.focus();
    await user.keyboard('{ArrowRight}{Enter}');

    expect(screen.getByRole('tab', { name: 'Miembros', selected: true })).toHaveFocus();
    const panel = screen.getByRole('tabpanel', { name: 'Miembros' });
    const rows = await within(panel).findAllByRole('listitem');
    expect(rows[0]).toHaveTextContent(/Ana.*Propietario/);
    expect(rows[1]).toHaveTextContent(/Luis.*Estudiante/);
    expect(within(rows[0]).queryByRole('button')).not.toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Abandonar workspace' })).not.toBeInTheDocument();
});

test('adds a registered member and refreshes the member list', async () => {
    const members: Member[] = [owner];
    const { user } = renderWorkspace('owner', members);
    let submitted: unknown;
    server.use(http.post(membersUrl, async ({ request }) => {
        submitted = await request.json();
        members.push(viewer);
        return HttpResponse.json({ data: viewer }, { status: 201 });
    }));

    await user.click(await screen.findByRole('tab', { name: 'Miembros' }));
    const email = await screen.findByLabelText('Correo electrónico');
    await user.type(email, viewer.email);
    await user.selectOptions(screen.getByLabelText('Rol'), 'viewer');
    await user.click(screen.getByRole('button', { name: 'Añadir miembro' }));

    expect(await screen.findByText(viewer.name)).toBeInTheDocument();
    expect(submitted).toEqual({ email: viewer.email, role: 'viewer' });
    await waitFor(() => expect(email).toHaveValue(''));
});

test('requires confirmation before removing a member and refreshes the list', async () => {
    const members: Member[] = [owner, student];
    const { user } = renderWorkspace('owner', members);
    let requests = 0;
    server.use(http.delete(`${membersUrl}/2`, () => {
        requests++;
        members.pop();
        return new HttpResponse(null, { status: 204 });
    }));

    await user.click(await screen.findByRole('tab', { name: 'Miembros' }));
    const remove = await screen.findByRole('button', { name: 'Eliminar a Luis' });
    await user.click(remove);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(requests).toBe(0);
    await user.click(remove);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar eliminación' }));

    const list = screen.getByRole('list');
    await waitFor(() => expect(within(list).queryByText('Luis')).not.toBeInTheDocument());
    expect(list).toHaveTextContent('Ana');
    expect(requests).toBe(1);
});

test('lets a non-owner leave using their own user ID and refreshes the workspace list', async () => {
    const { user, queryClient } = renderWorkspace('student');
    let left = false;
    queryClient.setQueryData(getListWorkspacesQueryKey(), {
        data: [{ id: 1, title: 'Club', status: 'active', role: 'student' }],
    });
    server.use(
        http.get(`${api}/workspaces`, () => HttpResponse.json({
            data: left ? [] : [{ id: 1, title: 'Club', status: 'active', role: 'student' }],
        })),
        http.delete(`${membersUrl}/2`, () => {
            left = true;
            return new HttpResponse(null, { status: 204 });
        }),
    );

    await user.click(await screen.findByRole('tab', { name: 'Miembros' }));
    await screen.findByText('Ana');
    const panel = screen.getByRole('tabpanel', { name: 'Miembros' });
    expect(within(panel).queryByRole('button', { name: 'Añadir miembro' })).not.toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: /Eliminar a/ })).not.toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'Abandonar workspace' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar abandono' }));

    expect(await screen.findByText('No tienes workspaces todavía.')).toBeInTheDocument();
    expect(left).toBe(true);
    expect(queryClient.getQueryState(getGetWorkspaceQueryKey(1))).toBeUndefined();
    expect(queryClient.getQueryState(getListWorkspaceMembersQueryKey(1))).toBeUndefined();
});

test('stays in the workspace when leaving returns 403', async () => {
    const { user } = renderWorkspace('student');
    server.use(http.delete(`${membersUrl}/2`, () => new HttpResponse(null, { status: 403 })));
    await user.click(await screen.findByRole('tab', { name: 'Miembros' }));
    await user.click(await screen.findByRole('button', { name: 'Abandonar workspace' }));
    const dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: 'Confirmar abandono' }));

    expect(await dialog.findByRole('alert')).toHaveTextContent('No tienes permiso para abandonar este workspace.');
    expect(screen.getByRole('heading', { name: 'Club' })).toBeInTheDocument();
    expect(screen.getByRole('list')).toHaveTextContent('Luis');
});

test.each([
    [403, 'No tienes permiso para ver los miembros.'],
    [500, 'No se pudieron cargar los miembros.'],
])('shows a member list error when the server returns %i', async (status, message) => {
    const { user } = renderWorkspace();
    server.use(http.get(membersUrl, () => new HttpResponse(null, { status })));
    await user.click(await screen.findByRole('tab', { name: 'Miembros' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByRole('button', { name: 'Añadir miembro' })).not.toBeInTheDocument();
});

test('keeps the form and list available when member mutations return 403', async () => {
    const { user } = renderWorkspace();
    server.use(
        http.post(membersUrl, () => new HttpResponse(null, { status: 403 })),
        http.delete(`${membersUrl}/2`, () => new HttpResponse(null, { status: 403 })),
    );
    await user.click(await screen.findByRole('tab', { name: 'Miembros' }));
    const email = await screen.findByLabelText('Correo electrónico');
    await user.type(email, viewer.email);
    await user.selectOptions(screen.getByLabelText('Rol'), 'viewer');
    await user.click(screen.getByRole('button', { name: 'Añadir miembro' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes permiso para añadir miembros.');
    expect(email).toHaveValue(viewer.email);

    await user.click(screen.getByRole('button', { name: 'Eliminar a Luis' }));
    const dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: 'Confirmar eliminación' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('No tienes permiso para eliminar este miembro.');
    expect(screen.getByRole('list')).toHaveTextContent('Luis');
});

test('shows loading and empty member states', async () => {
    const { user } = renderWorkspace('owner', []);
    let finishResponse!: () => void;
    const response = new Promise<void>((resolve) => { finishResponse = resolve; });
    server.use(http.get(membersUrl, async () => {
        await response;
        return HttpResponse.json({ data: [] });
    }));
    try {
        await user.click(await screen.findByRole('tab', { name: 'Miembros' }));
        expect(screen.getByRole('status')).toHaveTextContent('Cargando miembros...');
    } finally {
        finishResponse();
    }
    expect(await screen.findByText('No hay miembros en este workspace.')).toBeInTheDocument();
});
