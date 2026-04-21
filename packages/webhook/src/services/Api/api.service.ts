import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class ApiService {
    private readonly logger = new Logger(ApiService.name);
    public readonly client: AxiosInstance;

    constructor() {
        const baseURL = process.env.BACKEND_URL || 'http://localhost:3001';
        const token = process.env.WEBHOOK_SERVICE_INTERNAL_TOKEN;

        if (!token) {
            this.logger.warn('WEBHOOK_SERVICE_INTERNAL_TOKEN not set — backend calls will fail');
        }

        this.client = axios.create({
            baseURL,
            headers: { 'internal-service-token': token ?? '' },
        });
    }
}
