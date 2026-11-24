import { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { Download } from 'lucide-react';
import { exportTrainingSession } from '../../api/generated/workspace-training-sessions/workspace-training-sessions';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';

function getPdfFilename(disposition: string, sessionId: number) {
    const extended = /(?:^|;)\s*filename\*\s*=\s*UTF-8'[^']*'([^;]*)/i.exec(disposition)?.[1];
    const standard = /(?:^|;)\s*filename\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^;]*))/i.exec(disposition);
    let filename = standard?.[1]?.replace(/\\(["\\])/g, '$1') ?? standard?.[2];

    if (extended) {
        try {
            filename = decodeURIComponent(extended.trim());
        } catch {
            // Keep the regular filename when the extended parameter is malformed.
        }
    }

    const basename = filename?.split(/[/\\]/).pop()?.trim();
    return basename && basename !== '.' && basename !== '..' ? basename : `training-session-${sessionId}.pdf`;
}

function downloadPdf(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);

    try {
        link.click();
    } finally {
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 100);
    }
}

export function WorkspaceTrainingSessionExport({ workspaceId, sessionId }: { workspaceId: number; sessionId: number }) {
    const request = useRef<AbortController | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string>();

    useEffect(() => () => request.current?.abort(), []);

    async function handleDownload() {
        if (request.current) return;

        const controller = new AbortController();
        request.current = controller;
        setIsDownloading(true);
        setError(undefined);

        try {
            let disposition = '';
            const blob = await exportTrainingSession(workspaceId, sessionId, {
                headers: { Accept: 'application/pdf' },
                transformResponse: (data: unknown, headers) => {
                    const header = headers.get('content-disposition');
                    if (typeof header === 'string') disposition = header;
                    return data;
                },
            }, controller.signal);

            if (!controller.signal.aborted) {
                downloadPdf(blob, getPdfFilename(disposition, sessionId));
            }
        } catch (error) {
            if (controller.signal.aborted) return;

            const status = isAxiosError(error) ? error.response?.status : undefined;
            setError(status === 403
                ? 'No tienes permiso para descargar el PDF.'
                : status === 404
                    ? 'No se encontró la sesión para exportar.'
                    : 'No se pudo descargar el PDF.');
        } finally {
            request.current = null;
            if (!controller.signal.aborted) setIsDownloading(false);
        }
    }

    return (
        <div className="grid gap-2">
            <Button
                variant="secondary"
                className="flex items-center justify-center gap-2 sm:justify-self-start"
                onClick={handleDownload}
                disabled={isDownloading}
                aria-busy={isDownloading}
            >
                <Download size={18} aria-hidden="true" />
                {isDownloading ? 'Descargando PDF...' : 'Descargar PDF'}
            </Button>
            {error && <Alert variant="destructive">{error}</Alert>}
        </div>
    );
}
