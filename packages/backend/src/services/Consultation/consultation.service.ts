import { Injectable } from '@nestjs/common';
import { Principal } from '@/domain/Principal';
import { Consultation, Execution } from '@pretzel-graph/shared/domain';
import { RealtimeService } from '../Realtime/realtime.service';
import { PermissionService } from '../Permission/permission.service';

@Injectable()
export class ConsultationService {
    constructor(
        private readonly realtime:  RealtimeService,
        private readonly ownership: PermissionService,
    ) {}

    // Gate on execution ownership, publish onto the execution's one signal channel for the
    // parked node to route, then wait for the engine's acknowledgement before returning — so
    // the response only reports success once the answer has actually been consumed and the
    // node un-parked.
    //
    // executionId is the whole authorization story; consultationId is a correlation key both
    // directions narrow on in-process. Several consultations can be parked on one execution,
    // so the type alone isn't enough to tell whose acknowledgement arrived.
    async respond(
        principal: Principal.User,
        { executionId, consultationId, resolution }: Consultation.API.HumanResponded.Request,
    ): Promise<Consultation.API.HumanResponded.Response> {
        await this.ownership.assertExecution(executionId, principal.userId);

        const signal = Consultation.Signal.Responded.parse({
            channel:        Execution.Signal.getChannel(executionId),
            type:           'consultation:responded',
            executionId,
            consultationId,
            resolution,
        });

        const success = await this.realtime.signalAndAwaitEvent(
            signal,
            Execution.Event.getChannel(executionId),
            'consultation:resolved',
            5000,
            event => (event as Consultation.Event.Resolved).consultationId === consultationId,
        );

        return { success };
    }
}
