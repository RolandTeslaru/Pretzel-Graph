import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
import { Redis } from "@pretzel-graph/nodes/Credentials/Redis";

export const Blueprint = defineBlueprint({
    id: "Integrations.Redis.Command",
    displayName: "Redis",
    description: "Runs a command against a Redis server.",
    icon: "Redis",
    accent: "utility",
    credentials: [Redis],
    fields: [
        // operation drives the field schema via reconcile. Base (GET default) is operation + key;
        // SET reconciles in `value` (+ optional `ttl`). GET / DELETE need only the key.
        FieldBuilder.MultiOption({
            id: "operation",
            displayName: "Operation",
            reconcile: true,
            options: [
                { value: "GET", displayName: "Get" },
                { value: "SET", displayName: "Set" },
                { value: "DELETE", displayName: "Delete" },
            ],
            initialValue: "GET",
            tooltip: "The Redis command to run.",
        }),
        FieldBuilder.String({
            id: "key",
            displayName: "Key",
            required: true,
            placeholder: "my:key",
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Data({
            id: "result",
            displayName: "Result",
            tooltip: "GET → value (or null); SET → \"OK\"; DELETE → number of keys removed.",
        }),
    ],
});
