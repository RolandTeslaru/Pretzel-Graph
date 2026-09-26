import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { Vault } from "@pretzel-graph/shared/domain";

import { Blueprint } from "./blueprint";
import { buildTools } from "./tools";


export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun() {
        const f   = this.fieldValues;
        const api = this.context.internalAPI;

        if (f.isConvertedToTool === true)
            return { tools: buildTools(api) };

        switch (f.operation) {
            case "list": {
                const templateIds = Array.isArray(f.templateIds) && f.templateIds.length > 0
                    ? f.templateIds as Vault.Credential.Template.Id[]
                    : undefined;

                return { result: await Vault.API.Internal.query(api.raw, { templateIds }) };
            }
        }

        throw new Error("Unsupported operation");
    }
}
