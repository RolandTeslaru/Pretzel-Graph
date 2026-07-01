import { z } from "zod"

export const WorkflowId = z.uuid().brand("WorkflowId");
export type WorkflowId = z.infer<typeof WorkflowId>;

export const NodeId = z.string().brand("NodeId");
export type NodeId = z.infer<typeof NodeId>;

export const EdgeId = z.string().brand("EdgeId");
export type EdgeId = z.infer<typeof EdgeId>;

export const PublicationId = z.uuid().brand("PublicationId");
export type PublicationId = z.infer<typeof PublicationId>;

export const FolderId = z.uuid().brand("FolderId");
export type FolderId = z.infer<typeof FolderId>;