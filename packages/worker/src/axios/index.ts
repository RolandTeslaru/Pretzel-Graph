import axios from "axios";
import { container, singleton } from "tsyringe";

@singleton()
export class AxiosServiceImpl {
    constructor() {
        this.init();
    }

    public readonly api = axios.create({});

    public init() {
        // REQUEST INTERCEPTOR: Inject internal service token
        this.api.interceptors.request.use(async (config) => {
            const apiUrl = process.env.API_URL;
            config.baseURL = apiUrl;

            const token = process.env.WORKER_SERVICE_INTERNAL_TOKEN;

            // An absolute url overrides baseURL, so without this check any caller
            // reaching for this client could hand our token to a third-party host.
            if (token && apiUrl && new URL(config.url ?? '', apiUrl).origin === new URL(apiUrl).origin) {
                config.headers['Internal-Service-Token'] = token;
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