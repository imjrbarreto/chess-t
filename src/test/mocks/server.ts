import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw/http';

const apiUrl = import.meta.env.VITE_API_URL;

export const server = setupServer(
    http.get(`${apiUrl}/workspaces`, () => {
        return HttpResponse.json({ data: [] });
    }),

    http.get(`${apiUrl}/training-sessions`, () => {
        return HttpResponse.json({ data: [] });
    }),
);