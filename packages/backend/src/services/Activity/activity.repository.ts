import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { Execution, Workflow } from '@pretzel-graph/shared/domain';
import { Principal } from '@/domain/Principal';
import { Repository, Transactional } from '@/db/repository';
import { ZodReturn } from '../../decorators/database';

/** How many workflows the board shows, and how many runs each holds, at minimum. */
export const FLOOR = 5;

const WORKFLOW_META_COLUMNS = [
    'id',
    'folder_id',
    'display_name',
    'description',
    'icon',
    'accent',
    'icon_color',
    'locked',
    'hidden',
    'created_at',
    'updated_at',
] as const;

@Injectable()
export class ActivityRepository extends Repository {

    @Transactional('user')
    @ZodReturn(Execution.Meta.array())
    public async listRecentExecutions(principal: Principal.User): Promise<Execution.Meta[]> {
        const startOfDay = sql<string>`date_trunc('day', now())`;

        const rows = await this.trx
            .with('ranked', (db) => db
                .selectFrom('executions')
                .select([
                    'id',
                    'workflow_id',
                    'status',
                    'duration',
                    'error',
                    'chat_id',
                    'created_at',
                    'updated_at',
                    sql<boolean>`recording is not null`.as('has_recording'),
                    sql<Execution.Igniter.Variant>`igniter->>'variant'`.as('igniter_variant'),
                    sql<number>`row_number() over (partition by workflow_id order by created_at desc)`.as('run_rank'),
                    sql<string>`max(created_at) over (partition by workflow_id)`.as('last_run'),
                ])
            )
            // A run still going is kept whatever its rank: it may have started
            // yesterday, and the upper group is the point of the board.
            .with('picked', (db) => db
                .selectFrom('ranked')
                .selectAll()
                .select(sql<number>`dense_rank() over (order by last_run desc)`.as('workflow_rank'))
                .where((eb) => eb.or([
                    eb('run_rank', '<=', FLOOR),
                    eb('created_at', '>=', startOfDay),
                    eb('status', 'in', [...Execution.ACTIVE_STATUSES]),
                ]))
            )
            .selectFrom('picked')
            .selectAll()
            .where((eb) => eb.or([
                eb('workflow_rank', '<=', FLOOR),
                eb('last_run', '>=', startOfDay),
            ]))
            .orderBy('last_run', 'desc')
            .orderBy('created_at', 'desc')
            .execute();

        return rows.map((row) => Execution.Meta.parse(row));
    }

    /** The columns those runs belong to, in the order the board renders them. */
    @Transactional('user')
    @ZodReturn(Workflow.Meta.Schema.array())
    public async listWorkflowsByIds(principal: Principal.User, workflowIds: Workflow.Id[]): Promise<Workflow.Meta[]> {
        if (workflowIds.length === 0)
            return [];

        const rows = await this.trx
            .selectFrom('workflows')
            .select(WORKFLOW_META_COLUMNS)
            .where('id', 'in', workflowIds)
            .execute();

        return rows.map((row) => Workflow.Meta.Schema.parse(row));
    }
}
