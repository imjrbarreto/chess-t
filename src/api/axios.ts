import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        Accept: 'application/json',
    },
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