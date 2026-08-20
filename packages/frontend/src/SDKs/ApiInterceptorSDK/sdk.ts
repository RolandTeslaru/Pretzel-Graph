import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { getRequestToken, invalidateRequestToken, isScoped } from "./workspaceToken";

const g = globalThis as unknown as { __api?: AxiosInstance };

export const api: AxiosInstance = (g.__api ??= (() => {
    const instance = axios.create({
        baseURL: import.meta.env.VITE_API_URL,
    });

    instance.interceptors.request.use(async (config) => {
        // Resolved per request, not at module load: AuthSDK reaches back into this file.
        const token = await getRequestToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });

    instance.interceptors.response.use(
        (response) => response,
        async (error) => {
            const config = error.config as (InternalAxiosRequestConfig & { __retried?: boolean }) | undefined;

            // An expired exchanged token earns one retry on a fresh one; a
            // second 401 is a real denial and propagates.
            if (error.response?.status === 401 && isScoped() && config && !config.__retried) {
                invalidateRequestToken();
                config.__retried = true;
                return instance.request(config);
            }

            if (error.response?.status === 401) {
                console.warn("Backend rejected token.");
            }
            return Promise.reject(error);
        }
    );

    return instance;
})());

if (import.meta.hot) import.meta.hot.accept();
