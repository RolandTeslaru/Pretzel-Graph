import { Injectable, NotFoundException } from '@nestjs/common';
import { createAuthenticatedClient } from '@/utils/supabase';
import { Workflow, Workbench, Vault, Foundations } from '@pretzel-graph/shared/domain';
import { WorkbenchDatabase } from './workbench.database';
import { VaultDatabase } from '../Vault/vault.database';
import { decryptCredentialBlob } from '../Vault/vault.encryption';
import { CatalogueService, RuntimeNode } from '@pretzel-graph/node-sdk';
import { Token } from '@/domain/Token';
import { ShelfService } from '../Shelf/shelf.service';

@Injectable()
export class WorkbenchService {
    constructor(
        private readonly database: WorkbenchDatabase,
        private readonly vaultDatabase: VaultDatabase,
        private readonly shelfService: ShelfService,
    ) {}

    public readonly workflow = {
        create: async (
            token: string,
            payload: Workbench.API.Workflow.Create.Request,
        ): Promise<Workbench.API.Workflow.Create.Response> => {
            const supabase = createAuthenticatedClient(token);
            const workflow_id = await this.database.workflow.create(supabase, payload);
            return { workflow_id };
        },

        get: async (
            token: string,
            workflowId: Workflow.Id,
        ): Promise<Workbench.API.Workflow.Get.Response> => {
            const supabase = createAuthenticatedClient(token);
            const workflow = await this.database.workflow.get(supabase, workflowId);

            const blueprintIds = new Set<Foundations.Blueprint.Id>()
            for (const node of Object.values(workflow.data.nodes)){
                blueprintIds.add(node.blueprintId)
                if(node.reconciledBlueprintId)
                    blueprintIds.add(node.reconciledBlueprintId)
            }

            const { blueprints } = await this.shelfService.getBatchBlueprints({ blueprintIds: [...blueprintIds] });

            return { workflow, blueprints };
        },

        commit: async (
            token: string,
            payload: Workbench.API.Workflow.Commit.Request,
        ): Promise<Workbench.API.Workflow.Commit.Response> => {
            const supabase = createAuthenticatedClient(token);
            await this.database.workflow.commit(supabase, payload);
            return {};
        },
    };

    public readonly dependency = {
        published: {
            load: async (
                token: string,
                payload: Workbench.API.Dependency.Published.Load.Request,
            ): Promise<Workbench.API.Dependency.Published.Load.Response> => {
                const supabase = createAuthenticatedClient(token);
                const dependency = await this.database.dependency.published.load(supabase, payload.dependencyId);
                return { dependency };
            },

            checkUpdates: async (
                token: string,
                payload: Workbench.API.Dependency.Published.CheckUpdates.Request,
            ): Promise<Workbench.API.Dependency.Published.CheckUpdates.Response> => {
                const supabase = createAuthenticatedClient(token);
                const updates = await this.database.dependency.published.checkUpdates(supabase, payload.dependencies);
                return { updates };
            },
        },

        draft: {
            load: async (
                token: string,
                payload: Workbench.API.Dependency.Draft.Load.Request,
            ): Promise<Workbench.API.Dependency.Draft.Load.Response> => {
                const supabase = createAuthenticatedClient(token);
                const dependency = await this.database.dependency.draft.load(supabase, payload.dependencyId);
                return { dependency };
            },

            checkUpdates: async (
                token: string,
                payload: Workbench.API.Dependency.Draft.CheckUpdates.Request,
            ): Promise<Workbench.API.Dependency.Draft.CheckUpdates.Response> => {
                const supabase = createAuthenticatedClient(token);
                const updates = await this.database.dependency.draft.checkUpdates(supabase, payload.dependencies);
                return { updates };
            },
        },
    };

    public readonly field = {
        resourceLoader: {
            loadOptions: async (
                token: Token.UserSupabaseJWT,
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
                const supabase = createAuthenticatedClient(token);
                const ids = Object.values(payload.credentialInstanceIds);
                const instances = ids.length
                    ? await this.vaultDatabase.credentialInstance.listByIds(supabase, ids)
                    : [];
                const byId = new Map(instances.map(i => [i.id, i]));

                // credentials record, keyed by template id (the InferCredentials<B> shape).
                const credentials = Object.fromEntries(
                    Object.entries(payload.credentialInstanceIds)
                        .map(([templateId, instanceId]) => [templateId, byId.get(instanceId)] as const)
                        .filter(([, inst]) => inst !== undefined),
                );

                // credentialsAPI — identical surface to the worker's ExecutionContext.credentialsAPI.
                const credentialsAPI: RuntimeNode.LoaderContext['credentialsAPI'] = {
                    getInstance: (id) => byId.get(id),
                    getDecryptedValue: (blob) => decryptCredentialBlob(blob) as any,
                };

                // The backend operates without compile-time blueprint knowledge, so the
                // loader context is cast at this type-erased boundary.
                return await loaderFn({
                    fieldValues: payload.fieldValues,
                    credentials,
                    credentialsAPI,
                    searchQuery: payload.searchQuery,
                    paginationCursor: payload.paginationCursor,
                } as RuntimeNode.LoaderContext);
            },
        },
    };
}
