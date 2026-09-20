import { Injectable } from '@nestjs/common';
import { VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { Principal } from '@/domain/Principal';
import { Repository, Transactional } from '@/db/repository';
import { ZodReturn } from '@/decorators/database';

@Injectable()
export class ActivePublicationRepository extends Repository {

    @Transactional('service')
    @ZodReturn(VersionControl.Publication.Schema.array())
    public async list(
        _principal: Principal.Service,
    ): Promise<VersionControl.Publication[]> {
        const rows = await this.trx
            .selectFrom('version_control')
            .selectAll()
            .where('is_active', '=', true)
            .execute();

        return rows.map(DB.VersionControl.toDomain);
    }

    @Transactional('service')
    @ZodReturn(VersionControl.Publication.Schema.nullable())
    public async findByWorkflowId(
        _principal: Principal.Service,
        workflowId: Workflow.Id,
    ): Promise<VersionControl.Publication | null> {
        const row = await this.trx
            .selectFrom('version_control')
            .selectAll()
            .where('workflow_id', '=', workflowId)
            .where('is_active', '=', true)
            .orderBy('published_at', 'desc')
            .limit(1)
            .executeTakeFirst();

        return row ? DB.VersionControl.toDomain(row) : null;
    }
}
