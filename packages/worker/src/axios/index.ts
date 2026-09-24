import axios from "axios";
import { Injectable } from "@nestjs/common";
import { System } from "@pretzel-graph/shared/system";

@Injectable()
export class AxiosService {

    private readonly log = System.log.withContext("Axios");

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
                    this.log.warning("backend rejected token");
                }
                return Promise.reject(error);
            }
        );
    }
}
