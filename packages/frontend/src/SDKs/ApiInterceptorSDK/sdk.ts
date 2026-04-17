import axios, { type AxiosInstance } from "axios";
import { supabase } from "@/libs/supabase";

const g = globalThis as unknown as { __api?: AxiosInstance };

export const api: AxiosInstance = (g.__api ??= (() => {
    const instance = axios.create({
        baseURL: import.meta.env.VITE_API_URL,
    });

    instance.interceptors.request.use(async (config) => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
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
