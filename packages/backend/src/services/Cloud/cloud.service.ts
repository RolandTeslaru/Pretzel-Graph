import { Injectable } from '@nestjs/common';
import { SystemError } from '@pretzel-graph/shared/domain';

// The endpoints behind PRETZEL_CLOUD_URL. Unconfigured on a self-hosted deployment.
@Injectable()
export class CloudService {

    private readonly baseUrl     = process.env.PRETZEL_CLOUD_URL?.replace(/\/+$/, '') ?? null;
    public  readonly workspaceId = process.env.WORKSPACE_ID ?? null;
    private readonly token       = process.env.PRETZEL_CLOUD_TOKEN ?? null;

    public get isConfigured(): boolean {
        return this.baseUrl !== null;
    }

    // This deployment can act as its workspace against the cloud.
    public get hasWorkspaceIdentity(): boolean {
        return this.isConfigured && this.workspaceId !== null && this.token !== null;
    }

    // Assembles the url, attaches the workspace token, times out after 10s.
    public async fetch(path: string, init: RequestInit = {}): Promise<Response> {
        if (!this.baseUrl)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Pretzel Cloud is not configured on this deployment');

        const headers = new Headers(init.headers);

        if (this.token && !headers.has('X-Pretzel-Cloud-Token'))
            headers.set('X-Pretzel-Cloud-Token', this.token);

        try {
            return await fetch(`${this.baseUrl}${path}`, { ...init, headers, signal: AbortSignal.timeout(10_000) });
        }
        catch (error) {
            throw new SystemError(
                SystemError.Code.BAD_REQUEST,
                `Pretzel Cloud unreachable: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }
}
