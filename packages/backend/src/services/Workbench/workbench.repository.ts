import { Injectable } from '@nestjs/common';
import { Workflow, Workbench } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { Principal } from '@/domain/Principal';
import { Repository, Transactional } from '@/db/repository';
import { ZodReturn } from '../../decorators/database';

class WorkflowMethods extends Repository {

    @Transactional('user')
    @ZodReturn(Workflow.Id)
    public async create(
        principal: Principal.User,
        payload: Workbench.API.Workflow.Create.Request,
    ): Promise<Workflow.Id> {
        const { workflow } = payload;
        const row = await this.trx
            .insertInto('workflows')
            .values({
                folder_id: workflow.folder_id,
                display_name: workflow.display_name,
                description: workflow.description,
                icon: workflow.icon,
                accent: workflow.accent,
                icon_color: workflow.icon_color,
                locked: workflow.locked,
                mcp_enabled: false,
                data: workflow.data,
                created_by: principal.userId,
            })
            .returning('id')
            .executeTakeFirstOrThrow();

        return row.id;
    }

    @Transactional('user', 'delegate', 'service')
    @ZodReturn(Workflow.Schema)
    public async get(principal: Principal.User | Principal.Delegate | Principal.Service, workflowId: Workflow.Id): Promise<Workflow> {
        const row = await this.trx
            .selectFrom('workflows')
            .selectAll()
            .where('id', '=', workflowId)
            .executeTakeFirstOrThrow();

        return DB.Workflow.toDomain(row);
    }


    @Transactional('user')
    public async commit(
        principal: Principal.User,
        payload: Workbench.API.Workflow.Commit.Request,
    ): Promise<void> {
        await this.trx
            .updateTable('workflows')
            .set({ data: payload.data })
            .where('id', '=', payload.workflowId)
            .execute();
    }
}

@Injectable()
export class WorkbenchRepository {
    public readonly workflow = new WorkflowMethods();
}
