import { Injectable } from '@nestjs/common';
import { Principal } from '@/domain/Principal';
import { Execution, Workflow } from '@pretzel-graph/shared/domain';
import { PermissionService } from '../Permission/permission.service';
import { ExecutionRepository } from './execution.repository';
import { ExecutionTracker } from './execution.tracker';

@Injectable()
export class ExecutionDataService {

    constructor(
        private readonly ownership:           PermissionService,
        private readonly executionRepository: ExecutionRepository,
        private readonly tracker:             ExecutionTracker,
    ) {}




    // No ownership assert: the read runs through RLS, so another user's row surfaces as a 404.
    public async get(
        principal:   Principal.User,
        executionId: Execution.Id,
    ): Promise<Execution.API.Get.Response> {

        const execution = await this.executionRepository.get(principal, executionId);

        return { execution };
    }




    // Progress from the running graph, written as the execution's owner.
    public async update(
        payload: Execution.API.Update.Request
    ): Promise<Execution.API.Update.Response> {
        const { executionId, status, duration, session, recording } = payload;
        const delegate = await this.ownership.resolveDelegate(executionId);

        const meta = await this.executionRepository.updateProgress(delegate, { executionId, status, duration, session, recording });

        // Only a status move is activity; a session or recording write is not.
        if (status !== undefined)
            this.tracker.announce(meta);

        return {};
    }




    public readonly meta = {

        get: async (
            principal:   Principal.User,
            executionId: Execution.Id,
        ): Promise<Execution.API.Meta.Get.Response> => {

            const meta = await this.executionRepository.meta.get(principal, executionId);

            return { execution: meta };
        },


        list: async (
            principal:  Principal.User,
            workflowId: Workflow.Id,
        ): Promise<Execution.API.Meta.List.Response> => {

            const metaList = await this.executionRepository.meta.list(principal, workflowId);

            return { executions: metaList };
        },


        listActive: async (
            principal: Principal.User,
        ): Promise<Execution.API.Meta.ListActive.Response> => {
            const executions = await this.executionRepository.meta.listActive(principal);

            return { executions };
        },
    };
}
