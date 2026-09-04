import { Injectable, NotFoundException } from '@nestjs/common';
import { Principal } from '@/domain/Principal';
import { Workflow, Workbench, Vault } from '@pretzel-graph/shared/domain';
import { WorkbenchRepository } from './workbench.repository';
import { WorkbenchSessionService } from './session.service';
import { VaultRepository } from '../Vault/vault.repository';
import { OAuthService } from '../Vault/OAuth/oauth.service';
import { Encryption } from '@pretzel-graph/shared/server/vault/encryption';
import { CatalogueService, Loader } from '@pretzel-graph/node-sdk';
import { ShelfService } from '../Shelf/shelf.service';
import { ListingService } from '../Listing/listing.service';
import { Listing, SystemError } from '@pretzel-graph/shared/domain';

@Injectable()
export class WorkbenchService {
    constructor(
        private readonly sessions:        WorkbenchSessionService,
        private readonly repository:      WorkbenchRepository,
        private readonly vaultRepository: VaultRepository,
        private readonly oauth:           OAuthService,
        private readonly shelfService:    ShelfService,
        private readonly listings:        ListingService,
    ) {}

    public readonly workflow = {
        create: async (
            principal: Principal.User,
            payload: Workbench.API.Workflow.Create.Request,
        ): Promise<Workbench.API.Workflow.Create.Response> => {
            const workflow_id = await this.repository.workflow.create(principal, payload);
            return { workflow_id };
        },

        get: async (
            principal: Principal.User | Principal.Delegate,
            workflowId: Workflow.Id,
        ): Promise<Workbench.API.Workflow.Get.Response> => {
            let workflow: Workflow;

            if (Listing.isListingId(workflowId)) {
                const shared = await this.listings.getWorkflow(workflowId);

                if (!shared)
                    throw new SystemError(SystemError.Code.NOT_FOUND, 'Listing not found');

                workflow = shared;
            }
            else {
                workflow = await this.repository.workflow.get(principal, workflowId);
            }

            const { blueprints, repairs } = await this.shelfService.collectWorkflowBlueprints(workflow.data);

            workflow.locked = this.sessions.isLocked(workflowId)
            
            // Held by a session or not — the registry is the truth, not a column.
            return { workflow, blueprints, repairs };
        },

        commit: async (
            principal: Principal.User,
            payload: Workbench.API.Workflow.Commit.Request,
        ): Promise<Workbench.API.Workflow.Commit.Response> => {
            await this.repository.workflow.commit(principal, payload);
            return {};
        },
    };

    public readonly dependency = {
        published: {
            load: async (
                principal: Principal.User,
                payload: Workbench.API.Dependency.Published.Load.Request,
            ): Promise<Workbench.API.Dependency.Published.Load.Response> => {
                if (Listing.isListingId(payload.dependencyId)) {
                    const shared = await this.listings.getPublication(payload.dependencyId);

                    if (!shared)
                        throw new SystemError(SystemError.Code.NOT_FOUND, 'Listing not found or no longer listed');

                    return { dependency: shared };
                }

                const dependency = await this.repository.dependency.published.load(principal, payload.dependencyId);

                return { dependency };
            },

            checkUpdates: async (
                principal: Principal.User,
                payload: Workbench.API.Dependency.Published.CheckUpdates.Request,
            ): Promise<Workbench.API.Dependency.Published.CheckUpdates.Response> => {
                const local  = payload.dependencies.filter((dependency) => !Listing.isListingId(dependency.workflowId));
                const listed = payload.dependencies.filter((dependency) => Listing.isListingId(dependency.workflowId));

                const own    = await this.repository.dependency.published.checkUpdates(principal, local);
                const shared = await this.listings.checkUpdates(listed);

                return { updates: { ...own, ...shared } };
            },
        },

        draft: {
            load: async (
                principal: Principal.User,
                payload: Workbench.API.Dependency.Draft.Load.Request,
            ): Promise<Workbench.API.Dependency.Draft.Load.Response> => {
                const dependency = await this.repository.dependency.draft.load(principal, payload.dependencyId);
                return { dependency };
            },

            checkUpdates: async (
                principal: Principal.User,
                payload: Workbench.API.Dependency.Draft.CheckUpdates.Request,
            ): Promise<Workbench.API.Dependency.Draft.CheckUpdates.Response> => {
                const updates = await this.repository.dependency.draft.checkUpdates(principal, payload.dependencies);
                return { updates };
            },
        },
    };

    public readonly field = {
        resourceLoader: {
            loadOptions: async (
                principal: Principal.User,
                payload: Workbench.API.Field.ResourceLoader.LoadOptions.Request,
            ): Promise<Workbench.API.Field.ResourceLoader.LoadOptions.Response> => {
                const loaderFn = await CatalogueService.getLoader(
                    payload.blueprintId,
                    payload.loaderId,
                );

                if (!loaderFn)
                    throw new NotFoundException(
                        `No loader '${payload.loaderId}' on blueprint '${payload.blueprintId}'`
                    );

                // Fetch the node's selected credential instances through the user's
                // authenticated client — Supabase RLS gates ownership, so a spoofed
                // instance id simply yields no row (same guarantee as VaultService.reveal).
                const ids = Object.values(payload.credentialInstanceIds);
                const instances = ids.length
                    ? await this.vaultRepository.credentialInstance.listByIds(principal, ids)
                    : [];
                const byId = new Map(instances.map(i => [i.id, i]));

                // credentials record, keyed by template id (the InferCredentials<B> shape).
                const credentials = Object.fromEntries(
                    Object.entries(payload.credentialInstanceIds)
                        .map(([templateId, instanceId]) => [templateId, byId.get(instanceId)] as const)
                        .filter(([, inst]) => inst !== undefined),
                );

                // credentialsAPI — identical surface to the worker's ExecutionContext.credentialsAPI.
                const credentialsAPI: Loader.Context['credentialsAPI'] = {
                    getInstance: (id) => byId.get(id),
                    getDecryptedValue: (blob) => Encryption.decryptBlob(blob) as any,
                    getAccessToken: (id) => this.oauth.getAccessToken(principal, id).then(t => t.accessToken),
                };

                // The backend operates without compile-time blueprint knowledge, so the
                // loader context is cast at this type-erased boundary.
                return await loaderFn({
                    fieldValues: payload.fieldValues,
                    credentials,
                    credentialsAPI,
                    searchQuery: payload.searchQuery,
                    paginationCursor: payload.paginationCursor,
                } as Loader.Context);
            },
        },
    };

}
