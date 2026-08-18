import axios, { type AxiosInstance } from "axios";
import { SDK } from "@pretzel-graph/standard-ui/SDKs/SDKManager";
import type { AuthSDKImpl } from "../AuthSDK/sdk";

const g = globalThis as unknown as { __api?: AxiosInstance };

export const api: AxiosInstance = (g.__api ??= (() => {
    const instance = axios.create({
        baseURL: import.meta.env.VITE_API_URL,
    });

    instance.interceptors.request.use(async (config) => {
        // Resolved per request, not at module load: AuthSDK reaches back into this file.
        const token = await SDK.get<AuthSDKImpl>("Auth").getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });

    instance.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 401) {
                console.warn("Backend rejected token.");
            }
            return Promise.reject(error);
        }
    );

    return instance;
})());

if (import.meta.hot) import.meta.hot.accept();
