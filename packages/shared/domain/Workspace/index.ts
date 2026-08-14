import z from "zod";
import { Auth } from "../Auth";

// Who may act in this deployment, and with what rank.
export namespace Workspace {

    export const Role = z.enum(["owner", "admin", "member"]);
    export type  Role = z.infer<typeof Role>;

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
