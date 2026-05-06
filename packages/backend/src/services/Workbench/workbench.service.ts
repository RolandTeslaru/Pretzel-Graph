import { Injectable } from '@nestjs/common';
import { createAuthenticatedClient, createServiceClient, getUserId } from '@/utils/supabase';
import { Workflow, Workbench } from '@pretzel-graph/shared/domain';
import { WorkbenchDatabase } from './workbench.database';
import { VersionControlDatabase } from '../VersionControl/version-control.database';

@Injectable()
export class WorkbenchService {
    private readonly serviceSupabase = createServiceClient();

    constructor(
        private readonly database: WorkbenchDatabase,
        private readonly versionControlDatabase: VersionControlDatabase,
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
        resolveWorkflow: async (
            token: string,
            payload: Workbench.API.Dependency.ResolveWorkflow.Request,
        ): Promise<Workbench.API.Dependency.ResolveWorkflow.Response> => {
            const supabase = createAuthenticatedClient(token);
            const requesterId = await getUserId(supabase);
            if (!requesterId) throw new Error('Unauthenticated');

            const publication = await this.versionControlDatabase.getActivePublicationForWorkflow(
                this.serviceSupabase,
                payload.workflowId,
                requesterId,
            );

            return { publication };
        },
    };
}
