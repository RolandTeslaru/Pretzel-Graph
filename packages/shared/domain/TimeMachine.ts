import { z } from "zod";
import { Execution } from "./Execution";


export namespace TimeMachine {
    export namespace Recording {
        export const Id = z.string().brand("RecordingId");
        export type Id = z.infer<typeof Id>;

        export const Schema = z.object({
            id: Id,
            execution_id: Execution.Id,
            timeline: z.array(
                z.object({
                    event: z.string(),
                    details: z.record(z.string(), z.any()),
                })
            )
        })
    }
}
