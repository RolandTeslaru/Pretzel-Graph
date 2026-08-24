import { Injectable } from '@nestjs/common';
import { Principal } from '@/domain/Principal';
import { DB } from '@/db';
import { Listing, SystemError, VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { LibraryDatabase } from '../Library/library.database';
import { VersionControlDatabase } from '../VersionControl/version-control.database';
import { ListingRegistry } from './registry.client';

const ROOT_FOLDER_ID = '00000000-0000-4000-8000-000000000001' as Workflow['folder_id'];

@Injectable()
export class ListingService {
    constructor(
        private readonly libraryDb: LibraryDatabase,
        private readonly versionControlDb: VersionControlDatabase,
        private readonly registry: ListingRegistry,
    ) {}



    // An listing as the editor shows it: the graph, locked.
    public async getWorkflow(listingId: Listing.Id): Promise<Workflow | null> {
        if (!this.registry.canRead)
            return null;

        const entry = await this.registry.get(listingId);

        if (!entry)
            return null;

        const meta = entry.publicationMeta;

        return Workflow.Schema.parse({
            id:           listingId,
            display_name: meta.workflow_meta.display_name,
            description:  meta.workflow_meta.description,
            icon:         meta.workflow_meta.icon,
            accent:       meta.workflow_meta.accent,
            icon_color:   meta.workflow_meta.icon_color,
            locked:       true,
            listing_id:   entry.id,
            folder_id:    ROOT_FOLDER_ID,
            created_at:   meta.published_at,
            updated_at:   meta.published_at,
            data:         entry.workflowData,
        });
    }

    public async getPublication(listingId: Listing.Id): Promise<Workflow.Dependency.Publication | null> {
        if (!this.registry.canRead)
            return null;

        const entry = await this.registry.get(listingId);

        return entry ? Listing.toPublication(entry) : null;
    }

    public async checkUpdates(
        dependencies: Array<{ workflowId: Workflow.Id; publicationId: VersionControl.Publication.Id }>,
    ): Promise<Workflow.Dependency.Publication.UpdateMap> {
        if (!this.registry.canRead || dependencies.length === 0)
            return {};

        const current = await this.registry.getUpdates(dependencies.map((dependency) => dependency.workflowId));
        const updates: Workflow.Dependency.Publication.UpdateMap = {};

        for (const dependency of dependencies) {
            const info = current[dependency.workflowId];

            if (!info || info.id === dependency.publicationId)
                continue;

            updates[dependency.workflowId] = {
                workflowId:    dependency.workflowId,
                publicationId: info.id,
                version:       info.version,
                name:          info.name,
                description:   info.description,
            };
        }

        return updates;
    }

    public async shareWorkflow(principal: Principal.User, workflowId: Workflow.Id): Promise<Listing.Id> {
        if (!this.registry.canShare)
            throw new SystemError(SystemError.Code.FORBIDDEN, 'This deployment cannot share workflows');

        const { workflow, publication } = await DB.asUser(principal, async (trx) => ({
            workflow:    await this.libraryDb.workflow.get(trx, workflowId),
            publication: await this.versionControlDb.getActivePublicationForWorkflow(trx, workflowId),
        }));

        if (!publication)
            throw new SystemError(SystemError.Code.CONFLICT, 'A workflow needs an active publication before it can be public');

        const bound = getNodesBindingCredentials(publication.workflow_data);

        if (bound.length > 0)
            throw new SystemError(
                SystemError.Code.CONFLICT,
                'Remove credential bindings before making this workflow public',
                { data: { nodeIds: bound } },
            );

        const listingId = await this.push(workflow, publication);

        await DB.asUser(principal, (trx) => this.libraryDb.workflow.setListingId(trx, workflowId, listingId));

        return listingId;
    }

    // The registry mirrors whichever publication is active now.
    public async syncActive(principal: Principal.User, workflowId: Workflow.Id): Promise<void> {
        const { workflow, publication } = await DB.asUser(principal, async (trx) => ({
            workflow:    await this.libraryDb.workflow.get(trx, workflowId),
            publication: await this.versionControlDb.getActivePublicationForWorkflow(trx, workflowId),
        }));

        if (!workflow.listing_id)
            return;

        if (!publication) {
            await this.unshareWorkflow(principal, workflowId);
            return;
        }

        await this.push(workflow, publication);
    }

    public async unshareWorkflow(principal: Principal.User, workflowId: Workflow.Id): Promise<void> {
        const workflow = await DB.asUser(principal, (trx) => this.libraryDb.workflow.get(trx, workflowId));

        if (!workflow.listing_id)
            return;

        await this.registry.delete(workflow.listing_id);
        await DB.asUser(principal, (trx) => this.libraryDb.workflow.setListingId(trx, workflowId, null));
    }

    private async push(workflow: Workflow, publication: VersionControl.Publication): Promise<Listing.Id> {
        const { workflow_data, ...meta } = publication;

        return this.registry.put({
            id:              workflow.listing_id ?? undefined,
            publicationMeta: meta,
            workflowData:    workflow_data,
        });
    }
}

function getNodesBindingCredentials(data: Workflow.Data): Workflow.Node.Id[] {
    return Object.entries(data.credentialInstanceIds)
        .filter(([, bindings]) => Object.keys(bindings).length > 0)
        .map(([nodeId]) => nodeId as Workflow.Node.Id);
}
