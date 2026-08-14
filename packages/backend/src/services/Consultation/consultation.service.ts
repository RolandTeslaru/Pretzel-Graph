import { Injectable } from '@nestjs/common';
import { Consultation, Execution } from '@pretzel-graph/shared/domain';
import { RealtimeService } from '../Realtime/realtime.service';

@Injectable()
export class ConsultationService {
    constructor(
        private readonly realtime: RealtimeService,
    ) {}

    // Publish onto the execution's one signal channel for the parked node to route, then wait
    // for the engine's acknowledgement before returning — so the response only reports success
    // once the answer has actually been consumed and the node un-parked.
    //
    // consultationId is a correlation key both directions narrow on in-process. Several
    // consultations can be parked on one execution, so the type alone isn't enough to tell
    // whose acknowledgement arrived.
    async answer(
        executionId: Execution.Id,
        { consultationId, answer }: Consultation.API.Answer.Request,
    ): Promise<Consultation.API.Answer.Response> {

        const signal = Consultation.Signal.Answer.parse({
            channel:        Execution.Signal.getChannel(executionId),
            type:           'consultation:answer',
            executionId,
            consultationId,
            answer,
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
