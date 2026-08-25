import { Injectable } from '@nestjs/common';
import { Listing, SystemError, VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { CloudService } from '../Cloud/cloud.service';

// The listing registry: open reads, token-bearing writes, reached through CloudService.
@Injectable()
export class ListingRegistry {

    constructor(private readonly cloud: CloudService) {}

    public get canRead(): boolean {
        return this.cloud.isConfigured;
    }

    public get canShare(): boolean {
        return this.cloud.hasWorkspaceIdentity;
    }


    public async get(id: Listing.Id): Promise<Listing | null> {
        const body = await this.read(`/api/listings/${id}`, { allowNotFound: true });

        if (!body)
            return null;

        return Listing.API.Get.Response.parse(body).workflow;
    }

    public async getUpdates(ids: Workflow.Id[]): Promise<Record<Workflow.Id, VersionControl.Publication.Meta>> {
        if (ids.length === 0)
            return {};

        const body = await this.read(`/api/listings/updates?ids=${ids.join(',')}`);

        return Listing.API.Updates.Response.parse(body).updates;
    }

    public async put(request: Listing.API.Put.Request): Promise<Listing.Id> {
        const body = await this.write('PUT', `/api/workspaces/${this.cloud.workspaceId}/listings`, request);

        return Listing.API.Put.Response.parse(body).id;
    }

    public async delete(id: Listing.Id): Promise<void> {
        await this.write('DELETE', `/api/workspaces/${this.cloud.workspaceId}/listings/${id}`);
    }

    private async read(path: string, opts: { allowNotFound?: boolean } = {}): Promise<unknown> {
        const response = await this.cloud.fetch(path, { method: 'GET' });

        if (response.status === 404 && opts.allowNotFound)
            return null;

        if (!response.ok)
            throw new SystemError(SystemError.Code.BAD_REQUEST, `Listing registry answered ${response.status}`);

        return response.json();
    }

    private async write(method: 'PUT' | 'DELETE', path: string, payload?: unknown): Promise<unknown> {
        if (!this.canShare)
            throw new SystemError(SystemError.Code.FORBIDDEN, 'This deployment cannot share workflows');

        const response = await this.cloud.fetch(path, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: payload === undefined ? undefined : JSON.stringify(payload),
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');

            throw new SystemError(SystemError.Code.BAD_REQUEST, `Listing registry refused: ${response.status} ${text}`.trim());
        }

        return response.json();
    }
}
