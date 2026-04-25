import axios from "axios";
import { container, singleton } from "tsyringe";

@singleton()
class AxiosServiceImpl {
    constructor() {
        this.api.interceptors.request.use((config) => {
            const token = process.env.RUNTIME_NODE_INTERNAL_TOKEN;
            if (token) config.headers["Runtime-Node-Token"] = token;
            return config;
        });

        this.api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401)
                    console.warn("Backend rejected token.");
                return Promise.reject(error);
            }
        );
    }

    public readonly api = axios.create({
        baseURL: process.env.API_URL,
    });
}

export const AxiosService = container.resolve(AxiosServiceImpl);
