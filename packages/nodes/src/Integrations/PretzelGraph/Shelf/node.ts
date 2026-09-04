import { RuntimeNode } from "@pretzel-graph/node-sdk";
import type { Foundations } from "@pretzel-graph/shared/domain";

import { Blueprint } from "./blueprint";
import { getBlueprint, listDrawers } from "./catalogue";
import { buildTools } from "./tools";


export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun() {
        const f = this.fieldValues;

        if (f.isConvertedToTool === true)
            return { tools: buildTools() };

        switch (f.operation) {
            case "list": return { result: listDrawers() };
            case "get":  return { result: await getBlueprint(f.blueprintId as Foundations.Blueprint.Id) };
        }

        throw new Error("Unsupported operation");
    }
}
