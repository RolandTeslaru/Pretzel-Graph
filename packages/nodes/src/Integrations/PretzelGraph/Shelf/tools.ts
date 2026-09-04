import { tool } from "@langchain/core/tools";
import { ToolBudget } from "@pretzel-graph/node-sdk";
import type { Foundations } from "@pretzel-graph/shared/domain";
import { z } from "zod/v3";

import { getBlueprint, listDrawers } from "./catalogue";


export function buildTools() {

    const listBlueprints = tool(
        async () => ToolBudget.list("drawers", listDrawers()),
        {
            name:        "shelf_list_blueprints",
            description: "List every blueprint id that can be placed on a workflow, grouped by drawer. Read-only.",
            schema:      z.object({}),
        },
    );


    const getBlueprintTool = tool(
        async ({ blueprintId }) => ToolBudget.value(await getBlueprint(blueprintId as Foundations.Blueprint.Id)),
        {
            name:        "shelf_get_blueprint",
            description: "Get a blueprint's fields, input ports and output ports. A field marked reconcile changes the node's ports when set. Read-only.",
            schema:      z.object({ blueprintId: z.string().describe("Blueprint id, e.g. Core.Text.Input. See shelf_list_blueprints.") }),
        },
    );


    return [listBlueprints, getBlueprintTool];
}
