import axios from "axios";
import { supabase } from "@/libs/supabase";

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

// REQUEST INTERCEPTOR: Inject Token
api.interceptors.request.use(async (config) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// RESPONSE INTERCEPTOR: Global Error Handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.warn("Backend rejected token.");
        }
        return Promise.reject(error);
    }
);
