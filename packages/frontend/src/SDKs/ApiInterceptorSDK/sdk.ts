import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { getRequestToken, invalidateRequestToken, isScoped } from "./workspaceToken";

// The backend answers 503 with Retry-After while it is coming up. Without that
// header nothing is on its way, so the answer is final.
const RETRY_STATUSES = [502, 503, 504];
const RETRY_BUDGET_MS = 60_000;
const RETRY_MIN_MS = 1_000;
const RETRY_MAX_MS = 8_000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getRetryDelay = (headers: unknown): number | null => {
    const raw = (headers as Record<string, string> | undefined)?.['retry-after'];
    const seconds = Number(raw);

    if (!Number.isFinite(seconds))
        return null;

    return Math.min(Math.max(seconds * 1000, RETRY_MIN_MS), RETRY_MAX_MS);
};

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
            const config = error.config as (InternalAxiosRequestConfig & { __retried?: boolean; __waited?: number; noRetry?: boolean }) | undefined;
            const status = error.response?.status;

            if (config && !config.noRetry && RETRY_STATUSES.includes(status)) {
                const delay = getRetryDelay(error.response?.headers);
                const waited = config.__waited ?? 0;

                if (delay !== null && waited + delay <= RETRY_BUDGET_MS) {
                    config.__waited = waited + delay;

                    await wait(delay);

                    return instance.request(config);
                }
            }

            // An expired exchanged token earns one retry on a fresh one; a
            // second 401 is a real denial and propagates.
            if (status === 401 && isScoped() && config && !config.__retried) {
                invalidateRequestToken();
                config.__retried = true;
                return instance.request(config);
            }

            if (status === 401) {
                console.warn("Backend rejected token.");
            }
            return Promise.reject(error);
        }
    );

    return instance;
})());

if (import.meta.hot) import.meta.hot.accept();
