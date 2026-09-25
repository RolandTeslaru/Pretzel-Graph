import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Dependency, SystemError, VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { Principal } from '@/domain/Principal';
import { Repository, Transactional } from '@/db/repository';
import { ZodReturn } from '@/decorators/database';
import { META_COLUMNS } from '../VersionControl/version-control.repository';

@Injectable()
export class DeploymentRepository extends Repository {

    @Transactional('service')
    @ZodReturn(VersionControl.Publication.Schema.array())
    public async list(
        _principal: Principal.Service,
    ): Promise<VersionControl.Publication[]> {
        const rows = await this.trx
            .selectFrom('version_control')
            .selectAll()
            .where('is_deployed', '=', true)
            .execute();

        return rows.map(DB.VersionControl.toDomain);
    }

    @Transactional('user')
    @ZodReturn(z.record(Workflow.Id, VersionControl.Publication.Meta.Schema))
    public async listMeta(
        _principal: Principal.User,
    ): Promise<Record<Workflow.Id, VersionControl.Publication.Meta>> {
        const rows = await this.trx
            .selectFrom('version_control')
            .select(META_COLUMNS)
            .where('is_deployed', '=', true)
            .execute();

        return Object.fromEntries(
            rows.map((row) => [row.workflow_id, DB.VersionControl.toMeta(row)]),
        ) as Record<Workflow.Id, VersionControl.Publication.Meta>;
    }

    @Transactional('user', 'service')
    @ZodReturn(VersionControl.Publication.Schema.nullable())
    public async get(
        _principal: Principal.User | Principal.Service,
        workflowId: Workflow.Id,
    ): Promise<VersionControl.Publication | null> {
        const row = await this.trx
            .selectFrom('version_control')
            .selectAll()
            .where('workflow_id', '=', workflowId)
            .where('is_deployed', '=', true)
            .executeTakeFirst();

        return row ? DB.VersionControl.toDomain(row) : null;
    }

    @Transactional('user')
    @ZodReturn(VersionControl.Publication.Meta.Schema.nullable())
    public async getMeta(
        _principal: Principal.User,
        workflowId: Workflow.Id,
    ): Promise<VersionControl.Publication.Meta | null> {
        const row = await this.trx
            .selectFrom('version_control')
            .select(META_COLUMNS)
            .where('workflow_id', '=', workflowId)
            .where('is_deployed', '=', true)
            .executeTakeFirst();

        return row ? DB.VersionControl.toMeta(row) : null;
    }

    // Workflows whose deployed publication moved on from the one each snapshot was taken at.
    @Transactional('user')
    @ZodReturn(z.array(Dependency.Update.Publication.Schema))
    public async checkUpdates(
        _principal: Principal.User,
        dependencies: Array<Pick<Dependency.Update.Publication, 'id' | 'publicationId'>>,
    ): Promise<Dependency.Update.Publication[]> {
        if (!dependencies.length)
            return [];

        const snapshotPublicationId = new Map(
            dependencies.map((dependency) => [
                dependency.id,
                dependency.publicationId,
            ]),
        );
        const workflowIds = dependencies.map((dependency) => dependency.id);

        const rows = await this.trx
            .selectFrom('version_control')
            .select(['id', 'workflow_id', 'version', 'name', 'description'])
            .where('workflow_id', 'in', workflowIds)
            .where('is_deployed', '=', true)
            .execute();

        const updates: Dependency.Update.Publication[] = [];

        for (const row of rows) {
            if (snapshotPublicationId.get(row.workflow_id) === row.id)
                continue;

            updates.push({
                kind: "publishedWorkflow",
                id: row.workflow_id,
                publicationId: row.id,
                version: row.version,
                name: row.name,
                description: row.description,
            });
        }

        return updates;
    }

    @Transactional('user')
    @ZodReturn(VersionControl.Publication.Schema)
    public async deployLatest(
        _principal: Principal.User,
        workflowId: Workflow.Id,
    ): Promise<VersionControl.Publication> {
        const latest = await this.trx
            .selectFrom('version_control')
            .select('id')
            .where('workflow_id', '=', workflowId)
            .orderBy('version', 'desc')
            .limit(1)
            .executeTakeFirst();

        if (!latest)
            throw new SystemError(SystemError.Code.CONFLICT, 'Publish a version before deploying');

        return this._deploy(workflowId, latest.id);
    }

    @Transactional('user')
    @ZodReturn(VersionControl.Publication.Schema)
    public async deploy(
        _principal: Principal.User,
        workflowId: Workflow.Id,
        publicationId: VersionControl.Publication.Id,
    ): Promise<VersionControl.Publication> {
        return this._deploy(workflowId, publicationId);
    }

    @Transactional('user')
    @ZodReturn(VersionControl.Publication.Schema)
    public async undeploy(
        _principal: Principal.User,
        workflowId: Workflow.Id,
    ): Promise<VersionControl.Publication> {
        const row = await this.trx
            .updateTable('version_control')
            .set({ is_deployed: false })
            .where('workflow_id', '=', workflowId)
            .where('is_deployed', '=', true)
            .returningAll()
            .executeTakeFirst();

        if (!row)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Workflow is not deployed');

        return DB.VersionControl.toDomain(row);
    }

    // Undeploys the current publication first; the unique index allows one deployed row per workflow.
    private async _deploy(
        workflowId: Workflow.Id,
        publicationId: VersionControl.Publication.Id,
    ): Promise<VersionControl.Publication> {
        await this.trx
            .updateTable('version_control')
            .set({ is_deployed: false })
            .where('workflow_id', '=', workflowId)
            .where('is_deployed', '=', true)
            .where('id', '!=', publicationId)
            .execute();

        const row = await this.trx
            .updateTable('version_control')
            .set({ is_deployed: true })
            .where('id', '=', publicationId)
            .where('workflow_id', '=', workflowId)
            .returningAll()
            .executeTakeFirst();

        if (!row)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Publication not found');

        return DB.VersionControl.toDomain(row);
    }
}
