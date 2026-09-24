import { Injectable } from '@nestjs/common';
import { Execution } from '@pretzel-graph/shared/domain';
import { SystemError } from '@pretzel-graph/shared/domain/SystemError';
import { createRedisClient } from '../../utils/redis';

@Injectable()
export class ExecutionRecordingService {

    private readonly redis = createRedisClient('execution.recording.service');




    // Reads Redis, which RLS does not reach; the route's execution scope confines it to the caller's run.
    public async getLive(
        executionId: Execution.Id,
    ): Promise<Execution.API.Recording.GetLive.Response> {
        const key = Execution.Event.getChannel(executionId);
        const raw = await this.redis.get(key);

        if (!raw)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Live recording not found or expired');

        const recording = Execution.Recording.Schema.parse(JSON.parse(raw));

        return { recording };
    }
}
