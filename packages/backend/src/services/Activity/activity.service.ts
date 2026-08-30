import { Injectable } from '@nestjs/common';
import { Principal } from '@/domain/Principal';
import { Activity, Execution, Workflow } from '@pretzel-graph/shared/domain';
import { ActivityRepository } from './activity.repository';

@Injectable()
export class ActivityService {

    constructor(
        private readonly activityRepository: ActivityRepository,
    ) {}

    /**
     * The board's opening state. The runs decide which workflows are columns and
     * what order they come in, so they are read first and the columns follow.
     */
    async bootstrap(
        principal: Principal.User,
    ): Promise<Activity.API.Bootstrap.Response> {

        const executions = await this.activityRepository.listRecentExecutions(principal);

        const workflowIds = [...new Set(executions.map((execution) => execution.workflow_id))];

        const workflows = await this.activityRepository.listWorkflowsByIds(principal, workflowIds);

        return { workflows: this.toColumns(executions, workflows) };
    }

    /**
     * Keyed by workflow, with each column's runs left in the order the read
     * returned them — newest first.
     */
    private toColumns(
        executions: Execution.Meta[],
        workflows:  Workflow.Meta[],
    ): Record<Workflow.Id, Activity.Workflow> {
        const workflowById = new Map(workflows.map((workflow) => [workflow.id, workflow]));

        const columns: Record<Workflow.Id, Activity.Workflow> = {};

        for (const execution of executions) {
            const existing = columns[execution.workflow_id];

            if (existing) {
                existing.executions.push(execution);

                continue;
            }

            const workflow = workflowById.get(execution.workflow_id);

            // The row was deleted between the two reads.
            if (!workflow)
                continue;

            columns[execution.workflow_id] = { ...workflow, executions: [execution] };
        }

        return columns;
    }
}
