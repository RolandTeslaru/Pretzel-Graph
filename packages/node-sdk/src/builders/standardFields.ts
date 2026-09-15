import { defineField } from "./field";


// Framework fields defineBlueprint appends to every blueprint; blueprints may branch on them without declaring them.
export namespace StandardFields {
    export const toolConvertedField = defineField.Boolean(
        "isConvertedToTool",
        "Tool Mode",
        {
            hidden:       true,
            initialValue: false,
        },
    );

    export const signalDependencyStrategyField = defineField.MultiOption(
        "signalDependency",
        "Signal Dependency",
        {
        options: [
            { value: "AND", displayName: "(AND) All signals required",        description: "Fire only once every upstream signal has arrived." },
            { value: "OR",  displayName: "(OR) At least one signal required", description: "Fire as soon as any upstream signal arrives (re-fires on each — enables cycles)." },
            { value: "XOR", displayName: "(XOR) Exactly one signal required", description: "Fire on exactly one signal. If two or more arrive at once, the run fails with a collision error." },
        ],
        initialValue: "OR",
        tooltip:      "Determines how incoming signals are evaluated to trigger node execution.",
        },
    );

    export const dataDependencyStrategyField = defineField.MultiOption(
        "dataDependency",
        "Data Dependency",
        {
        options: [
            { value: "AND", displayName: "Wait & Join",    description: "Wait until every wired input port has resolved, then read all of them." },
            { value: "OR",  displayName: "Follow Trigger", description: "Don't wait — read only the input port(s) that propagated the triggering signal." },
        ],
        initialValue: "AND",
        tooltip:      "Controls how the node gathers its inputs once it's been triggered: wait for all wired ports, or read only the ones that fired.",
        },
    );

    export const onErrorStrategyField = defineField.MultiOption(
        "onErrorStrategy",
        "On Error",
        {
        options: [
            { value: "terminate",  displayName: "Terminate workflow", description: "Fail the whole run." },
            { value: "propagate",  displayName: "Propagate error",    description: "Forward the error along outgoing edges." },
            { value: "do_nothing", displayName: "Do nothing",         description: "Swallow the error — no signal, no termination. Downstream stalls." },
        ],
        initialValue: "propagate",
        tooltip:      "What happens when this node's execution throws.",
        },
    );


    export const StandardNode = [
        signalDependencyStrategyField,
        dataDependencyStrategyField,
        onErrorStrategyField,
    ] as const;

    export const TOOL_FIELDS = [toolConvertedField] as const;

    export const IDS: ReadonlySet<string> = new Set(
        [...StandardNode, ...TOOL_FIELDS].map(field => String(field.id)),
    );

    // Selects the standard fields for a blueprint, keeping the literal tuple type.
    export function forBlueprint<const T_ToolCompatible extends boolean | undefined>(
        toolCompatible: T_ToolCompatible,
    ): [T_ToolCompatible] extends [true]
        ? readonly [...typeof StandardNode, ...typeof TOOL_FIELDS]
        : typeof StandardNode {

        return (toolCompatible ? [...StandardNode, ...TOOL_FIELDS] : StandardNode) as any;
    }
}
