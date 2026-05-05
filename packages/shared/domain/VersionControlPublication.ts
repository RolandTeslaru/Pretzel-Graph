import z from "zod";
import { Auth } from "./Auth";

export namespace VersionControlPublication {
    export const Id = z.uuid().brand("PublicationId");
    export type Id = z.infer<typeof Id>;

    export const WorkflowId = z.string().brand("WorkflowId");
    export type WorkflowId = z.infer<typeof WorkflowId>;

    export interface Publication<TWorkflowData> {
        id: Id;
        workflow_id: WorkflowId;
        version: number;
        name: string;
        description: string | null;
        workflow_data: TWorkflowData;
        user_id: Auth.User.Id;
        is_active: boolean;
        published_at: Date;
    }

    export function createSchema<TWorkflowData>(
        workflowDataSchema: z.ZodType<TWorkflowData>,
    ) {
        return z.object({
            id: Id,
            workflow_id: WorkflowId,
            version: z.number(),
            name: z.string(),
            description: z.string().nullable(),
            workflow_data: workflowDataSchema,
            user_id: Auth.User.Id,
            is_active: z.boolean(),
            published_at: z.coerce.date(),
        });
    }
}
