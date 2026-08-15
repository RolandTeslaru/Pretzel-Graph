import z from "zod";

// Its own module: Auth and Workspace both need it, and they already reference
// each other.
export const Role = z.enum(["owner", "admin", "member"]);
export type  Role = z.infer<typeof Role>;
