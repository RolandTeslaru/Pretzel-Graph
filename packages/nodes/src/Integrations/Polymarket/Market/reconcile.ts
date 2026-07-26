import { Foundations } from "@pretzel-graph/shared/domain";
import { InferReconcilingFieldValues } from "@pretzel-graph/node-sdk";

import { MarketAction } from "./actions";
import { Blueprint, ToolBlueprint } from "./blueprint";
import { OPERATIONS, OPERATION_FIELD_IDS } from "./fields";

// Which selectors stay visible for a given action — the rest are branches of the
// cascade the user isn't on.
const visibleSelectors = (values: Record<string, unknown>): string[] => {
    switch (values.action) {
        case "list":
            return [
                "action",
                "listAPI",
                values.listAPI === "clob" ? "listClobKind"
                    : values.listAPI === "data" ? "listDataKind"
                    : "listGammaKind",
            ];

        case "get":
            return [
                "action",
                "getAPI",
                values.getAPI === "clob" ? "getClobKind"
                    : values.getAPI === "data" ? "getDataKind"
                    : "getGammaKind",
            ];

        case "search":
        default:
            return ["action", "searchKind"];
    }
};

const ALL_SELECTORS = [
    "searchKind",
    "listAPI", "listGammaKind", "listClobKind", "listDataKind",
    "getAPI",  "getGammaKind",  "getClobKind",  "getDataKind",
];

export const reconcile = (
    blueprint: Foundations.Blueprint,
    fieldValues: InferReconcilingFieldValues<typeof Blueprint>,
): Foundations.Blueprint => {

    if (fieldValues.isConvertedToTool === true)
        return ToolBlueprint;

    const values    = fieldValues as unknown as Record<string, unknown>;
    const visible   = visibleSelectors(values);
    const operation = MarketAction.resolve(values);
    const spec      = OPERATIONS[operation];

    const kept = blueprint.fields
        .filter(field =>
            !OPERATION_FIELD_IDS.includes(field.id) &&
            !(ALL_SELECTORS.includes(field.id) && !visible.includes(field.id)))
        // The base hides off-branch selectors; the ones we keep are on-branch by definition.
        .map(field => visible.includes(field.id) ? { ...field, hidden: false } : field);

    // @ts-expect-error rebuild the readonly fields tuple
    blueprint.fields = [...kept, ...spec.fields()];
    // @ts-expect-error each operation emits exactly one result port
    blueprint.outputs = [spec.output()];

    return blueprint;
};
