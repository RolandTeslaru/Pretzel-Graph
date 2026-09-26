import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { Library } from "@pretzel-graph/shared/domain";

import { Blueprint } from "./blueprint";
import { buildTools } from "./tools";


export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun() {
        const f   = this.fieldValues;
        const api = this.context.internalAPI;

        if (f.isConvertedToTool === true)
            return { tools: buildTools(api) };

        switch (f.operation) {
            case "query": {
                const kinds = Array.isArray(f.kinds) && f.kinds.length > 0
                    ? f.kinds as Library.Ref.Kind[]
                    : undefined;
                const displayName = f.displayName?.trim() || undefined;

                return { result: await Library.API.Internal.query(api.raw, { kinds, displayName }) };
            }
        }

        throw new Error("Unsupported operation");
    }
}
