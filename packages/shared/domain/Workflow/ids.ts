import { z } from "zod"
import type { Field } from "../Foundations/Field";

export const WorkflowId = z.uuid().brand("WorkflowId");
export type WorkflowId = z.infer<typeof WorkflowId>;

export const NodeId = z.string().brand("NodeId");
export type NodeId = z.infer<typeof NodeId>;

export const EdgeId = z.string().brand("EdgeId");
export type EdgeId = z.infer<typeof EdgeId>;

// Doubly branded: consumers embed a listing id as a dependency's workflow id.
// The fixed first group makes a listing id recognisable from the value alone.
export const LISTING_ID_PREFIX = "115ed000";

export const ListingId = z.uuid().refine((value) => value.startsWith(LISTING_ID_PREFIX)).brand("ListingId").brand("WorkflowId");
export type ListingId = z.infer<typeof ListingId>;

export const isListingId = (value: string): value is ListingId =>
    value.startsWith(LISTING_ID_PREFIX);

export const PublicationId = z.uuid().brand("PublicationId");
export type PublicationId = z.infer<typeof PublicationId>;

export const FolderId = z.uuid().brand("FolderId");
export type FolderId = z.infer<typeof FolderId>;

export const SkillId = z.uuid().brand("SkillId");
export type SkillId = z.infer<typeof SkillId>;

export const ConnectionId = z.uuid().brand("Gateway.Connection.Id");
export type ConnectionId = z.infer<typeof ConnectionId>;

export const ConnectionDefinitionId = z.string().brand("Gateway.Definition.Id");
export type ConnectionDefinitionId = z.infer<typeof ConnectionDefinitionId>;

// Reserved field id of the workflow dependency that shapes a node and decides what it runs.
export const SHAPE_DEPENDENCY_FIELD_ID = "__shape_dependency__" as Field.Id;
