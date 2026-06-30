import { Injectable } from '@nestjs/common';
import { Auth, HumanReview } from '@pretzel-graph/shared/domain';
import { RealtimeService } from '../Realtime/realtime.service';
import { PermissionService } from '../Permission/permission.service';

@Injectable()
export class HumanReviewService {
    constructor(
        private readonly realtime:  RealtimeService,
        private readonly ownership: PermissionService,
    ) {}

    // Gate on execution ownership, publish the per-request signal the parked node awaits, then
    // wait for the worker's Event.Resolved so the response only returns once the engine has
    // actually consumed the answer and un-parked (the human already replied, so this is a fast ack).
    async humanResponded(
        userId: Auth.User.Id,
        { executionId, requestId, resolution }: HumanReview.API.HumanResponded.Request,
    ): Promise<HumanReview.API.HumanResponded.Response> {
        await this.ownership.assertExecution(executionId, userId);

        const success = await this.realtime.signalAndAwaitEvent<HumanReview.Signal.HumanResponded.Schema>(
            {
                channel:    HumanReview.Signal.HumanResponded.getChannel(executionId, requestId),
                type:       'human-review:responded',
                resolution,
            },
            HumanReview.Event.getChannel(executionId),
            'human-review:resolved',
        );

        return { success };
    }
}
