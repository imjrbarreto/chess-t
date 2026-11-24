import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from '../App';
import type { WorkspaceRole } from '../api/generated/models';
import { setAccessToken } from '../auth/session';
import { server } from '../test/mocks/server';
import { renderWithProviders } from '../test/renderWithProviders';

const api = import.meta.env.VITE_API_URL;
const path = '/workspaces/1/training-sessions/7';
const exportUrl = `${api}${path}/export`;
const pdf = '%PDF-1.7';
const createObjectURL = vi.fn<(blob: Blob) => string>();
const revokeObjectURL = vi.fn();
const downloads = vi.fn<(filename: string, url: string) => void>();

beforeEach(() => {
    createObjectURL.mockReset().mockReturnValue('blob:training-session');
    revokeObjectURL.mockClear();
    downloads.mockClear();
    const OriginalURL = URL;
    vi.stubGlobal('URL', class extends OriginalURL {
        static createObjectURL = createObjectURL;
        static revokeObjectURL = revokeObjectURL;
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        downloads(this.download, this.href);
    });
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    setAccessToken(null);
});

function renderDetail(role: WorkspaceRole) {
    setAccessToken('test-token');
    server.use(
        http.get(`${api}/users/me`, () => HttpResponse.json({
            data: { id: 1, name: 'Ana', email: 'ana@example.com' },
        })),
        http.get(`${api}/workspaces/1`, () => HttpResponse.json({
            data: { id: 1, title: 'Club', status: 'active', role },
        })),
        http.get(`${api}${path}`, () => HttpResponse.json({
            data: { id: 7, user_id: 3, title: 'Finales de torre', category: 'endgame' },
        })),
        http.get(`${api}${path}/responses`, () => HttpResponse.json({ data: [] })),
    );
    renderWithProviders(<App />, path);
    return userEvent.setup();
}

function pdfResponse(disposition?: string) {
    const headers = new Headers({ 'Content-Type': 'application/pdf' });
    if (disposition) headers.set('Content-Disposition', disposition);
    return new HttpResponse(pdf, { headers });
}

test('downloads the authenticated blob once during a pending export and uses the encoded filename', async () => {
    const user = renderDetail('student');
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    const requestHeaders = vi.fn();
    server.use(http.get(exportUrl, async ({ request }) => {
        requestHeaders(request.headers.get('Authorization'));
        await pending;
        return pdfResponse('attachment; filename="fallback.pdf"; filename*=UTF-8\'\'Sesi%C3%B3n%207.pdf');
    }));

    const button = await screen.findByRole('button', { name: 'Descargar PDF' });
    expect(requestHeaders).not.toHaveBeenCalled();
    try {
        await user.dblClick(button);
        expect(await screen.findByRole('button', { name: 'Descargando PDF...' })).toBeDisabled();
        await waitFor(() => expect(requestHeaders).toHaveBeenCalledExactlyOnceWith('Bearer test-token'));
        expect(downloads).not.toHaveBeenCalled();
    } finally {
        finish();
    }

    await waitFor(() => expect(downloads).toHaveBeenCalledExactlyOnceWith('Sesión 7.pdf', 'blob:training-session'));
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('application/pdf');
    expect(await blob.text()).toBe(pdf);
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:training-session'));
    expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeEnabled();
});

test.each([
    ['viewer', 'attachment; filename="Finales; torneo.pdf"', 'Finales; torneo.pdf'],
    ['coach', 'attachment; filename=torneo.pdf', 'torneo.pdf'],
    ['owner', undefined, 'training-session-7.pdf'],
] as const)('allows %s to export and selects the filename', async (role, disposition, filename) => {
    const user = renderDetail(role);
    server.use(http.get(exportUrl, () => pdfResponse(disposition)));

    await user.click(await screen.findByRole('button', { name: 'Descargar PDF' }));

    await waitFor(() => expect(downloads).toHaveBeenCalledExactlyOnceWith(filename, 'blob:training-session'));
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalled());
});

test.each([
    [403, 'No tienes permiso para descargar el PDF.'],
    [404, 'No se encontró la sesión para exportar.'],
    [500, 'No se pudo descargar el PDF.'],
])('reports export error %i and allows a retry', async (status, message) => {
    const user = renderDetail('viewer');
    server.use(http.get(exportUrl, () => new HttpResponse(null, { status })));
    const button = await screen.findByRole('button', { name: 'Descargar PDF' });

    await user.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(downloads).not.toHaveBeenCalled();
    expect(button).toBeEnabled();

    server.use(http.get(exportUrl, () => pdfResponse()));
    await user.click(button);
    await waitFor(() => expect(downloads).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalled());
});
