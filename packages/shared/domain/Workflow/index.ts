import { z } from "zod"
import { Auth } from "../Auth"

import * as NodeMod from "./node"
import * as EdgeMod from "./edge"
import * as DataMod from "./data"
import * as DepMod from "./dependency"
import * as CacheMod from "./cache"
import { WorkflowId, FolderId } from "./ids"
import { WORKFLOW_DATA_VERSION } from "./migrate"

export namespace Workflow {
    export const Id = WorkflowId
    export type Id = WorkflowId

    /** Dummy node ID used as the staticValues key for workflow-level config fields. */
    export const WORKFLOW_CONFIG_NODE_ID = "__workflow_config__" as Node.Id

    export function createId() {
        return crypto.randomUUID() as Workflow.Id
    }

    export const DEFAULT_ICON = "graph"
    export const DEFAULT_ACCENT = "utility"

    // Re-export the sub-module namespaces. `export import` carries the value,
    // the type, and nested members (e.g. Node.Id as both value and type).
    export import Node         = NodeMod.Node
    export import HydratedNode = NodeMod.HydratedNode
    export import Edge         = EdgeMod.Edge
    export import Data         = DataMod.Data
    export import Layout       = DataMod.Data.Layout
    export import Viewport     = DataMod.Data.Viewport
    export import Dependency   = DepMod.Dependency
    export import Cache        = CacheMod.Cache

    export const createCache        = CacheMod.createCache
    export const deriveArcs         = CacheMod.deriveArcs
    export const deriveReversedArcs = CacheMod.deriveReversedArcs

    export const Schema = z.object({
        id:           WorkflowId,
        display_name: z.string(),
        locked:       z.boolean(),
        is_public:    z.boolean().default(false),
        description:  z.string().optional().nullable(),
        icon:         z.string().nullable().optional(),
        accent:       z.string().nullable().optional(),
        icon_color:   z.string().nullable().optional(),

        created_at: z.coerce.date(),
        updated_at: z.coerce.date(),

        folder_id: FolderId,

        data: Data.Schema
    });

    export namespace Database {
        export namespace Row {
            export const Schema = Workflow.Schema.extend({
                user_id: Auth.User.Id,
            })
        }
        export type Row = z.infer<typeof Row.Schema>
    }

    export const INITIAL = {
        id:             "" as Workflow.Id,
        locked:         false,
        is_public:      false,
        display_name:   "",
        description:    "",
        icon:           null,
        accent:         null,
        icon_color:     null,
        folder_id:      "" as Workflow["folder_id"],
        created_at:     new Date(),
        updated_at:     new Date(),
        data: {
            version:               WORKFLOW_DATA_VERSION,
            fields:                [],
            nodes:                 {},
            edges:                 [],
            staticValues:          {},
            credentialInstanceIds: {},
            dependencies:          { published: {}, draft: {} },
            ui: {
                layout:         {},
                viewport:       { x: 0, y: 0, zoom: 1 },
                icon_color:     null,
            }
        }
    } as const satisfies z.infer<typeof Schema>
}
export type Workflow = z.infer<typeof Workflow.Schema>
