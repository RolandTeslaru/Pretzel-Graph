import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Portal.Out",
    displayName: "Portal Out",
    description: "Receives data from a Portal In node sharing the same Portal ID.",
    icon: "PortalOut",
    accent: "group-routing",
    fields: [
        FieldBuilder.UniqueString({
            id: "portalId",
            displayName: "Portal ID",
            required: true,
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Unresolved({
            id: "output",
            displayName: "Output",
            polymorphicGroupId: "portal",
        }),
    ],
});
