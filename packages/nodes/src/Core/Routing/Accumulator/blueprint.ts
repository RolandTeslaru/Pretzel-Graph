import { defineBlueprint, StandardFields, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Accumulator",
    displayName: "Accumulator",
    description: "Collects inputs over multiple executions and emits the accumulated result.",
    icon: "GitPullRequestArrow",
    accent: "group-routing",
    fields: [
        {
            ...StandardFields.dataDependencyStrategyField,
            initialValue: "OR"
        }
    ],
    inputs: [
        defineInput.UnresolvedList("overwrite", "Overwrite", {
            polymorphicGroupId: "data"
        }),
        defineInput.UnresolvedList("append", "Append", {
            polymorphicGroupId: "data"
        }),
    ],
    outputs: [
        defineOutput.UnresolvedList("state", "State", {
            tooltip: "The accumulated state.",
            polymorphicGroupId: "data"
        }),
        defineOutput.UnresolvedList("prevState", "Previous State", {
            tooltip: "The previous accumulated state.",
            polymorphicGroupId: "data"
        }),
    ],
});
