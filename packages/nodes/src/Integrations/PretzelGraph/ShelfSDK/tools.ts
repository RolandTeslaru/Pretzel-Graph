import { tool } from "@langchain/core/tools";
import { ToolBudget, type HTTP } from "@pretzel-graph/node-sdk";
import { Shelf, type Foundations } from "@pretzel-graph/shared/domain";
import { z } from "zod/v3";

import { listDerivations, projectToBaseBlueprint } from "./catalogue";


const PORT_VARIANTS = ["Message", "MessageList", "Data", "DataList", "Text", "LanguageModel", "Document", "Retriever", "Embeddings", "VectorStore", "Tool"] as const;

const strings = z.array(z.string()).optional();


export function buildTools(api: HTTP.Client) {

    const queryBlueprints = tool(
        async (query) => {
            const { items, total } = await Shelf.API.Internal.query(api.raw, query as never);

            return ToolBudget.list("blueprints", items, { hint: total > items.length ? `${total} matched; ${items.length} returned. Narrow the query or raise limit.` : undefined });
        },
        {
            name:        "shelf_query_blueprints",
            description: "Find blueprints that can be placed on a workflow. Filters combine; omit all to list everything. Each result has the id, name, drawer, capabilities, field ids and port kinds; use shelf_get_blueprint for the full shape. Read-only.",
            schema: z.object({
                ids:             strings.describe("Only these blueprint ids."),
                displayName:     z.string().optional().describe("Case-insensitive substring of the display name."),
                drawerIds:       strings.describe("Only blueprints in these shelf drawers."),
                toolCompatible:  z.boolean().optional().describe("Can be handed to an agent as tools."),
                proxyCompatible: z.boolean().optional().describe("Can route its network traffic through a proxy credential."),
                derivable:       z.boolean().optional().describe("Some field values reshape the node's ports."),
                fieldIds:        strings.describe("Has every one of these fields."),
                inputVariants:   z.array(z.enum(PORT_VARIANTS)).optional().describe("Has an input port of any of these kinds."),
                outputVariants:  z.array(z.enum(PORT_VARIANTS)).optional().describe("Has an output port of any of these kinds."),
                limit:           z.number().int().positive().max(500).optional().describe("Default 50."),
            }),
        },
    );


    const getBlueprint = tool(
        async ({ blueprintId }) => {
            const { blueprint } = await Shelf.API.Internal.get(api.raw, blueprintId as Foundations.Blueprint.Id);

            return ToolBudget.value(projectToBaseBlueprint(blueprint));
        },
        {
            name:        "shelf_get_blueprint",
            description: "Get a blueprint's fields, input ports and output ports. A field marked reconcile changes the node's ports when set. Read-only.",
            schema:      z.object({ blueprintId: z.string().describe("Blueprint id, e.g. Core.Text.Input. See shelf_query_blueprints.") }),
        },
    );


    const getDerivations = tool(
        async ({ blueprintId }) => {
            const { blueprint } = await Shelf.API.Internal.get(api.raw, blueprintId as Foundations.Blueprint.Id);

            return ToolBudget.list("derivations", listDerivations(blueprint), {
                hint: "Ask for the base blueprint to see the fields these paths condition on.",
            });
        },
        {
            name:        "shelf_get_blueprint_derivations",
            description: "List every way a blueprint's node can be reshaped: each path is the field values that select a branch, with the fields and ports that branch adds and any base members it replaces. Set those fields with workbench_set_field to reach a branch. Read-only.",
            schema:      z.object({ blueprintId: z.string().describe("Blueprint id. Only derivable blueprints have branches; see shelf_query_blueprints.") }),
        },
    );


    return [queryBlueprints, getBlueprint, getDerivations];
}
