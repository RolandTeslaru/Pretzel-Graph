import { Injectable } from '@nestjs/common';
import { createAuthenticatedClient, getUserId } from '@/utils/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { withSupabaseAssert } from '@vx-agent-editor/shared/errors/supabase';
import { Workflow, Workbench } from '@vx-agent-editor/shared/domain';

@Injectable()
export class WorkbenchService {
	private readonly dbOps = {
		workflow: {
			create: withSupabaseAssert('workbench.workflow.create', async (
				supabase: SupabaseClient,
				payload: Workbench.API.Workflow.Create.Request,
			) => {
				const workflow = payload.workflow;
				const user_id = await getUserId(supabase);
				if (!user_id) throw new Error('Unauthenticated');

				const { data: row } = await supabase
					.from('workflows')
					.insert({
						folder_id: workflow.folder_id,
						display_name: workflow.display_name,
						description: workflow.description,
						locked: workflow.locked,
						mcp_enabled: false,
						data: workflow.data,
						user_id: user_id,
					})
					.select('id')
					.single<{ id: Workflow.Id }>()
					.throwOnError();

				return row.id;
			}),

			get: withSupabaseAssert('workbench.workflow.get', async (
				supabase: SupabaseClient,
				workflowId: Workflow.Id,
			) => {
				const { data: row } = await supabase
					.from('workflows')
					.select('*')
					.eq('id', workflowId)
					.single<Workflow.Database.Row>()
					.throwOnError();

				return Workflow.Schema.parse(row);
			}),

			commit: withSupabaseAssert('workbench.workflow.commit', async (
				supabase: SupabaseClient,
				payload: Workbench.API.Workflow.Commit.Request,
			) => {
				const workflowId = payload.workflow.id;
				await supabase
					.from('workflows')
					.update(payload.workflow)
					.eq('id', workflowId)
					.throwOnError();
			}),
		},
	};

	public readonly workflow = {
		create: async (
			token: string,
			payload: Workbench.API.Workflow.Create.Request,
		): Promise<Workbench.API.Workflow.Create.Response> => {
			const supabase = createAuthenticatedClient(token);
			const workflow_id = await this.dbOps.workflow.create(supabase, payload);
			return { workflow_id };
		},

		get: async (
			token: string,
			workflowId: Workflow.Id,
		): Promise<Workbench.API.Workflow.Get.Response> => {
			const supabase = createAuthenticatedClient(token);
			const workflow = await this.dbOps.workflow.get(supabase, workflowId);
			return { workflow };
		},

		commit: async (
			token: string,
			payload: Workbench.API.Workflow.Commit.Request,
		): Promise<Workbench.API.Workflow.Commit.Response> => {
			const supabase = createAuthenticatedClient(token);
			await this.dbOps.workflow.commit(supabase, payload);
			return {};
		},
	};
}
