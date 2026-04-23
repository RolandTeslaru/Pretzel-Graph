import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Accumulator",
    displayName: "Accumulator",
    description: "Collects inputs over multiple executions and emits the accumulated result.",
    icon: "GitPullRequestArrow",
    accent: "group-routing",
    fields: [
    ],
    inputs: [
        InputBuilder.UnresolvedList({
            id: "overwrite",
            displayName: "Overwrite",
            polymorphicGroupId: "data"
        }),
        InputBuilder.UnresolvedList({
            id: "append",
            displayName: "Append",
            polymorphicGroupId: "data"
        }),
    ],
    outputs: [
        OutputBuilder.UnresolvedList({
            id: "state",
            displayName: "State",
            tooltip: "The accumulated state.",
            polymorphicGroupId: "data"
        }),
        OutputBuilder.UnresolvedList({
            id: "prevState",
            displayName: "Previous State",
            tooltip: "The previous accumulated state.",
            polymorphicGroupId: "data"
        }),
    ],
});
