import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { SystemError, Workflow, Workbench } from '@pretzel-graph/shared/domain';
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

    @Transactional('user', 'delegate')
    @ZodReturn(Workflow.Schema)
    public async get(principal: Principal.User | Principal.Delegate, workflowId: Workflow.Id): Promise<Workflow> {
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

class PublishedDependencyMethods extends Repository {

    @Transactional('user')
    @ZodReturn(Workflow.Dependency.Publication.Schema)
    public async load(
        principal: Principal.User,
        workflowId: Workflow.Id,
    ): Promise<Workflow.Dependency.Publication> {
        const workflow = await this.trx
            .selectFrom('workflows')
            .select(['id', 'display_name', 'icon', 'accent'])
            .where('id', '=', workflowId)
            .executeTakeFirstOrThrow();

        const row = await this.trx
            .selectFrom('version_control')
            .selectAll()
            .where('workflow_id', '=', workflowId)
            .where('is_active', '=', true)
            .executeTakeFirst();

        if (!row)
            throw new SystemError(
                SystemError.Code.NOT_FOUND,
                'No active publication found for this workflow',
            );

        const publication = DB.VersionControl.toDomain(row);

        return {
            ...publication,
            publication_name: publication.name,
            display_name: workflow.display_name,
            icon: workflow.icon,
            accent: workflow.accent,
        };
    }


    @Transactional('user')
    @ZodReturn(Workflow.Dependency.Publication.UpdateMap)
    public async checkUpdates(
        principal: Principal.User,
        dependencies: Workbench.API.Dependency.Published.CheckUpdates.Request['dependencies'],
    ): Promise<Workflow.Dependency.Publication.UpdateMap> {
        if (!dependencies.length)
            return {};

        const storedByWorkflow = new Map(
            dependencies.map((dependency) => [
                dependency.workflowId,
                dependency.publicationId,
            ]),
        );
        const workflowIds = dependencies.map((dependency) => dependency.workflowId);

        const rows = await this.trx
            .selectFrom('version_control')
            .select(['id', 'workflow_id', 'version', 'name', 'description'])
            .where('workflow_id', 'in', workflowIds)
            .where('is_active', '=', true)
            .execute();

        const updates: Workflow.Dependency.Publication.UpdateMap = {};

        for (const row of rows) {
            if (storedByWorkflow.get(row.workflow_id) === row.id)
                continue;

            updates[row.workflow_id] = {
                workflowId: row.workflow_id,
                publicationId: row.id,
                version: row.version,
                name: row.name,
                description: row.description,
            };
        }

        return updates;
    }
}

class DraftDependencyMethods extends Repository {

    @Transactional('user')
    @ZodReturn(Workflow.Dependency.Draft.Schema)
    public async load(
        principal: Principal.User,
        workflowId: Workflow.Id,
    ): Promise<Workflow.Dependency.Draft> {
        const row = await this.trx
            .selectFrom('workflows')
            .select(['id', 'display_name', 'icon', 'accent', 'data', 'updated_at'])
            .where('id', '=', workflowId)
            .executeTakeFirst();

        if (!row)
            throw new SystemError(
                SystemError.Code.NOT_FOUND,
                'Workflow not found or not accessible',
            );

        return {
            workflow_id: row.id,
            workflow_data: Workflow.Data.Schema.parse(row.data),
            display_name: row.display_name,
            icon: row.icon,
            accent: row.accent,
            workflow_updated_at: row.updated_at,
        };
    }

    @Transactional('user')
    @ZodReturn(z.record(Workflow.Id, Workflow.Dependency.Draft.UpdateInfo))
    public async checkUpdates(
        principal: Principal.User,
        dependencies: Workbench.API.Dependency.Draft.CheckUpdates.Request['dependencies'],
    ): Promise<Record<Workflow.Id, Workflow.Dependency.Draft.UpdateInfo>> {
        if (!dependencies.length)
            return {};

        const storedByWorkflow = new Map(
            dependencies.map((dependency) => [
                dependency.workflowId,
                dependency.workflow_updated_at,
            ]),
        );
        const workflowIds = dependencies.map((dependency) => dependency.workflowId);

        const rows = await this.trx
            .selectFrom('workflows')
            .select(['id', 'updated_at'])
            .where('id', 'in', workflowIds)
            .execute();

        const updates: Record<Workflow.Id, Workflow.Dependency.Draft.UpdateInfo> = {};

        for (const row of rows) {
            const stored = storedByWorkflow.get(row.id);
            const changed = new Date(stored ?? 0).getTime() !== new Date(row.updated_at).getTime();

            if (changed) {
                updates[row.id] = {
                    workflowId: row.id,
                    workflow_updated_at: row.updated_at,
                };
            }
        }

        return updates;
    }
}

class DependencyMethods {
    public readonly published = new PublishedDependencyMethods();
    public readonly draft = new DraftDependencyMethods();
}

@Injectable()
export class WorkbenchRepository {
    public readonly workflow = new WorkflowMethods();
    public readonly dependency = new DependencyMethods();
}
