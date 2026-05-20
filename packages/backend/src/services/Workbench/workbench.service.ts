import { Injectable } from '@nestjs/common';
import { createAuthenticatedClient } from '@/utils/supabase';
import { Workflow, Workbench } from '@pretzel-graph/shared/domain';
import { WorkbenchDatabase } from './workbench.database';

@Injectable()
export class WorkbenchService {
    constructor(
        private readonly database: WorkbenchDatabase,
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
            return { workflow };
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
}
