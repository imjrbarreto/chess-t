import axios from 'axios';
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { getSession, setAccessToken } from '../auth/session';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        Accept: 'application/json',
    },
});

const publicPaths = new Set(['/login', '/register', '/up'].map((url) =>
    new URL(api.getUri({ url }), window.location.href).pathname,
));
const apiOrigin = new URL(api.getUri(), window.location.href).origin;
const authenticatedRequests = new WeakMap<InternalAxiosRequestConfig, ReturnType<typeof getSession>>();

api.interceptors.request.use((config) => {
    const session = getSession();
    const url = new URL(api.getUri(config), window.location.href);

    if (session.token && url.origin === apiOrigin && !publicPaths.has(url.pathname)) {
        config.headers.set('Authorization', `Bearer ${session.token}`);
        authenticatedRequests.set(config, session);
    }

    return config;
});

api.interceptors.response.use(undefined, (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && error.config
        && authenticatedRequests.get(error.config) === getSession()) {
        setAccessToken(null);
    }

    return Promise.reject(error);
});

export async function customInstance<T>(
    config: AxiosRequestConfig,
    options?: AxiosRequestConfig,
): Promise<T> {
    const response = await api.request<T>({
        ...config,
        ...options,
    });

    return response.data;
}
