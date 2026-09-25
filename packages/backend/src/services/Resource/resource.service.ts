import { Injectable } from '@nestjs/common';
import { Principal } from '@/domain/Principal';
import { Dependency, Listing, Resource, SystemError, Workflow } from '@pretzel-graph/shared/domain';
import { WorkbenchService } from '../Workbench/workbench.service';
import { ListingService } from '../Listing/listing.service';
import { LibraryRepository } from '../Library/repository';
import { DeploymentRepository } from '../Deployment/deployment.repository';

@Injectable()
export class ResourceService {
    constructor(
        private readonly workbench:  WorkbenchService,
        private readonly listings:   ListingService,
        private readonly library:    LibraryRepository,
        private readonly deployments: DeploymentRepository,
    ) {}

    public async load(
        principal: Principal.User,
        ref: Resource.API.Load.Request,
    ): Promise<Resource.API.Load.Response> {
        switch (ref.kind) {
            case 'draftWorkflow': {
                const workflow = await this.library.workflow.get(principal, ref.id);

                const dependency = Dependency.Value.Draft.Schema.parse({
                    ...workflow,
                    kind:          'draftWorkflow',
                    workflow_data: workflow.data,
                });

                return { dependency };
            }

            case 'publishedWorkflow': {
                const deployment = await this.deployments.get(principal, ref.id);

                if (!deployment)
                    throw new SystemError(SystemError.Code.NOT_FOUND, 'This workflow has no deployed publication');

                const dependency = Dependency.Value.Publication.Schema.parse({
                    ...deployment.workflow_meta,
                    ...deployment,
                    kind: 'publishedWorkflow',
                });

                return { dependency };
            }

            case 'listing': {
                const publication = await this.listings.getPublication(ref.id);

                if (!publication)
                    throw new SystemError(SystemError.Code.NOT_FOUND, 'Listing not found or no longer listed');

                return { dependency: publication };
            }

            case 'skill': {
                const skill = await this.library.skill.get(principal, ref.id);

                const dependency = Dependency.Value.Skill.Schema.parse({
                    ...skill,
                    kind: 'skill',
                });

                return { dependency };
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
    private async collectUpdates(
        principal: Principal.User,
        dependencies: Workflow.Data['dependencies'],
    ): Promise<Dependency.Update[]> {
        const drafts:       Array<Pick<Dependency.Update.Draft, 'id' | 'updated_at'>>          = [];
        const publications: Array<Pick<Dependency.Update.Publication, 'id' | 'publicationId'>> = [];
        const listings:     Array<Pick<Dependency.Update.Listing, 'id' | 'publicationId'>>     = [];
        const skills:       Array<Pick<Dependency.Update.Skill, 'id' | 'content_hash'>>        = [];

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

                case 'skill':
                    skills.push({ id: value.id, content_hash: value.content_hash });
                    break;

                default:
                    value satisfies never;
            }
        }

        const updates = await Promise.all([
            this.library.workflow.checkUpdates(principal, drafts),
            this.deployments.checkUpdates(principal, publications),
            this.library.skill.checkUpdates(principal, skills),
            this.listings.checkUpdates(listings).catch(() => []),
        ]);

        return updates.flat();
    }
}
