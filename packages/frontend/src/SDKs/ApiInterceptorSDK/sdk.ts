import axios from "axios";
import { supabase } from "@/libs/supabase"; // You need to create this!

const baseURL = ""

export class _ApiInterceptorSDK_ {
    private constructor() {
        this.init();
    }
    public static readonly instance = new _ApiInterceptorSDK_();
    public readonly api = axios.create({
        baseURL: baseURL, // Make sure this is http://localhost:3000
    });
    public init() {
        // REQUEST INTERCEPTOR: Inject Token
        this.api.interceptors.request.use(async (config) => {
            // Check if this is a request for the New Node.js Backend
            const isNewBackend = config.url?.startsWith('/api/library')
                || config.url?.startsWith('/api/shelf')
                || config.url?.startsWith('/api/vault')
                || config.url?.startsWith('/api/orchestrator');

            if (isNewBackend) {
                // Use Supabase Token
                const { data } = await supabase.auth.getSession();
                const token = data.session?.access_token;
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } else {
                // Use Legacy Token (from Cookies/LocalStorage)
                // The legacy app likely put it in headers automatically via its own logic, 
                // OR we need to replicate it.
                // If we do nothing here, Axios sends NO header (unless legacy had a global default).
                // Let's try to grab it from AuthSDK store state if possible.
                // Assuming AuthSDK is available globablly or we just don't touch headers for legacy 
                // and hope the browser cookie handles it? 
                // Cookies assume `withCredentials: true`. 
                // Does Axios have that?

                // If I modify this to NOT touch headers for legacy, maybe cookie auto-sends?
            }
            return config;
        });
        // RESPONSE INTERCEPTOR: Global Error Handling (Optional)
        this.api.interceptors.response.use(
            (response) => response,
            (error) => {
                // If 401, Supabase client likely handles it, but good to debug
                if (error.response?.status === 401) {
                    console.warn("Backend rejected token.");
                }
                return Promise.reject(error);
            }
        );
    }
}
export const ApiInterceptorSDK = _ApiInterceptorSDK_.instance;
export const api = ApiInterceptorSDK.api;