import { defineBlueprint, FieldBuilder, InputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Portal.In",
    displayName: "Portal In",
    description: "Sends data to all Portal Out nodes sharing the same Portal ID, without a visible edge.",
    icon: "PortalIn",
    accent: "group-routing",
    fields: [
        FieldBuilder.UniqueString({
            id: "portalId",
            displayName: "Portal ID",
            required: true,
        }),
    ],
    inputs: [
        InputBuilder.Unresolved({
            id: "input",
            displayName: "Input",
            polymorphicGroupId: "portal",
        }),
    ],
    outputs: [],
});
