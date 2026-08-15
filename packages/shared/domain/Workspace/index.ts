import z from "zod";
import { Auth } from "../Auth";
import { Role as RoleSchema } from "./role";

// Who may act in this deployment, and with what rank.
export namespace Workspace {

    export const Role = RoleSchema;
    export type  Role = z.infer<typeof RoleSchema>;

    export namespace Member {
        export const Schema = z.object({
            user_id:    Auth.User.Id,
            role:       Role,
            created_at: z.coerce.date(),
            updated_at: z.coerce.date(),
        });
    }
    export type Member = z.infer<typeof Member.Schema>;
}
