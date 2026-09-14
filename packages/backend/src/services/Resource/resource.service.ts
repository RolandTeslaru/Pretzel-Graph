import { Injectable } from '@nestjs/common';
import { Principal } from '@/domain/Principal';
import { Dependency, Listing, Resource, SystemError, Workflow } from '@pretzel-graph/shared/domain';
import { ResourceRepository } from './resource.repository';
import { WorkbenchService } from '../Workbench/workbench.service';
import { ListingService } from '../Listing/listing.service';

@Injectable()
export class ResourceService {
    constructor(
        private readonly repository: ResourceRepository,
        private readonly workbench:  WorkbenchService,
        private readonly listings:   ListingService,
    ) {}

    public async load(
        principal: Principal.User,
        ref: Resource.API.Load.Request,
    ): Promise<Resource.API.Load.Response> {
        switch (ref.kind) {
            case 'draftWorkflow':
                return { dependency: await this.repository.draftWorkflow.load(principal, ref.id) };

            case 'publishedWorkflow':
                return { dependency: await this.repository.publishedWorkflow.load(principal, ref.id) };

            case 'listing': {
                const publication = await this.listings.getPublication(ref.id);

                if (!publication)
                    throw new SystemError(SystemError.Code.NOT_FOUND, 'Listing not found or no longer listed');

                return { dependency: publication };
            }
        }
    }

    public async checkUpdates(
        principal: Principal.User,
        payload: Resource.API.CheckUpdates.Request,
    ): Promise<Resource.API.CheckUpdates.Response> {
        const workflow = await this.workbench.workflow.find(principal, payload.workflowId);

        return { updates: await this.collectUpdates(principal, workflow.data.dependencies) };
    }

    // Checks each embedded snapshot against its source; listing checks are best-effort.
    private async collectUpdates(principal: Principal.User, dependencies: Workflow.Data['dependencies']): Promise<Dependency.Update[]> {
        const drafts:       Array<Pick<Dependency.Update.Draft, 'id' | 'updated_at'>>          = [];
        const publications: Array<Pick<Dependency.Update.Publication, 'id' | 'publicationId'>> = [];
        const listings:     Array<Pick<Dependency.Update.Listing, 'id' | 'publicationId'>>     = [];

        for (const value of Object.values(dependencies)) {
            switch (value.kind) {
                case 'draftWorkflow':
                    drafts.push({ id: value.id, updated_at: value.updated_at });
                    break;

                case 'publishedWorkflow':
                    publications.push({ id: value.workflow_id, publicationId: value.id });
                    break;

                case 'listing':
                    listings.push({ id: value.workflow_id as Listing.Id, publicationId: value.id });
                    break;

                default:
                    value satisfies never;
            }
        }

        return [
            ...await this.repository.draftWorkflow.checkUpdates(principal, drafts),
            ...await this.repository.publishedWorkflow.checkUpdates(principal, publications),
            ...await this.listings.checkUpdates(listings).catch(() => []),
        ];
    }
}
