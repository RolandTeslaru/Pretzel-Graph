import axios from "axios";
import { container, singleton } from "tsyringe";

@singleton()
export class AxiosServiceImpl {
    constructor() {
        this.init();
    }

    public readonly api = axios.create({
        baseURL: process.env.API_URL,
    });

    public init() {
        // REQUEST INTERCEPTOR: Inject Token
        this.api.interceptors.request.use(async (config) => {
            const token = process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            return config;
        });

        // RESPONSE INTERCEPTOR: Global Error Handling
        this.api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    console.warn("Backend rejected token.");
                }
                return Promise.reject(error);
            }
        );
    }
}

export const AxiosService = container.resolve(AxiosServiceImpl);