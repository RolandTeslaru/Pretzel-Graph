import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Accumulator",
    displayName: "Accumulator",
    description: "Collects inputs over multiple executions and emits the accumulated result.",
    icon: "GitPullRequestArrow",
    accent: "group-routing",
    fields: [
        {
            ...FieldBuilder.DEFAULTS.dataDependencyStrategyField,
            initialValue: "OR"
        }
    ],
    inputs: [
        InputBuilder.UnresolvedList("overwrite", "Overwrite", {
            polymorphicGroupId: "data"
        }),
        InputBuilder.UnresolvedList("append", "Append", {
            polymorphicGroupId: "data"
        }),
    ],
    outputs: [
        OutputBuilder.UnresolvedList("state", "State", {
            tooltip: "The accumulated state.",
            polymorphicGroupId: "data"
        }),
        OutputBuilder.UnresolvedList("prevState", "Previous State", {
            tooltip: "The previous accumulated state.",
            polymorphicGroupId: "data"
        }),
    ],
});
