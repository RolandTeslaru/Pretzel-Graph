import { Foundations } from "@pretzel-graph/shared/domain";
import { InferReconcilingFieldValues, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
import { Blueprint, ToolBlueprint } from "./blueprint";

const asField = (b: unknown) => b as unknown as Foundations.Field;

const timespanField = () => asField(FieldBuilder.MultiOption("timespan", "Timespan", {
    options: [
        { value: "minute", displayName: "Minute" },
        { value: "hour", displayName: "Hour" },
        { value: "day", displayName: "Day" },
    ],

    initialValue: "minute",
    tooltip: "Candle granularity."
}));

const multiplierField = () => asField(FieldBuilder.Integer("multiplier", "Multiplier", {
    initialValue: 1,
    min: 1,
    max: 60,
    tooltip: "Candle multiplier (e.g. 5 + minute = 5-minute candles)."
}));

const lookbackField = () => asField(FieldBuilder.Integer("lookbackHours", "Lookback (hours)", {
    initialValue: 24,
    min: 1,
    max: 24 * 365,
    tooltip: "How far back to fetch candles, in hours. The end time is always 'now'."
}));

const adjustedField = () => asField(FieldBuilder.Boolean("adjusted", "Adjusted", {
    initialValue: true,
    advanced: true,
    tooltip: "Whether to request adjusted data for aggregates when supported by the API."
}));

const timeframeField = () => asField(FieldBuilder.MultiOption("timeframe", "Timeframe", {
    options: [
        { value: "annual", displayName: "Annual" },
        { value: "quarterly", displayName: "Quarterly" },
    ],

    initialValue: "quarterly",
    tooltip: "Reporting period for the financial statements."
}));

const limitField = () => asField(FieldBuilder.Integer("limit", "Limit", {
    initialValue: 4,
    min: 1,
    max: 100,
    tooltip: "How many reporting periods to return."
}));


// Derives fields + output ports from `action`:
//   candles    → timespan/multiplier/lookback/adjusted; candles (DataList) + summary
//   financials → timeframe/limit; DataList, one item per reporting period
//   snapshot / details / marketStatus → no fields, a single Data port
const ACTION_FIELD_IDS = [
    "timespan", "multiplier", "lookbackHours", "adjusted", "timeframe", "limit",
] as Foundations.Field.Id[];

export const reconcile = (
    blueprint: Foundations.Blueprint,
    fieldValues: InferReconcilingFieldValues<typeof Blueprint>,
): Foundations.Blueprint => {

    // Tool mode has its own schema — the action field doesn't apply, the agent picks a tool.
    if (fieldValues.isConvertedToTool === true)
        return ToolBlueprint;

    const kept = blueprint.fields.filter(f => !ACTION_FIELD_IDS.includes(f.id));

    let actionFields: Foundations.Field[];
    let outputs: unknown[];

    switch (fieldValues.action) {

        case "snapshot":
            actionFields = [];
            outputs = [OutputBuilder.Data("data", "Snapshot", {
                tooltip: "Live state: today's OHLC and volume, change, the previous day's bar, last trade and last quote."
            })];
            break;

        case "details":
            actionFields = [];
            outputs = [OutputBuilder.Data("data", "Details", {
                tooltip: "Company reference data: name, description, market cap, shares outstanding, exchange, branding."
            })];
            break;

        case "financials":
            actionFields = [timeframeField(), limitField()];
            outputs = [OutputBuilder.DataList("data", "Financials", {
                tooltip: "One item per reporting period: income statement, balance sheet and cash flow."
            })];
            break;

        case "marketStatus":
            actionFields = [];
            outputs = [OutputBuilder.Data("data", "Market Status", {
                tooltip: "Whether US markets are currently open, plus after-hours and per-exchange status."
            })];
            break;

        case "candles":
        default:
            actionFields = [timespanField(), multiplierField(), lookbackField(), adjustedField()];
            outputs = [
                OutputBuilder.DataList("candles", "Candles", {
                    tooltip: "Array of OHLCV aggregates (bars) returned by Massive."
                }),
                OutputBuilder.Data("summary", "Summary", {
                    tooltip: "Convenience summary: { ticker, timespan, multiplier, count, firstClose, lastClose, change, changePct }."
                }),
            ];
            break;
    }

    // @ts-expect-error rebuild the readonly fields tuple
    blueprint.fields = [...kept, ...actionFields];
    // @ts-expect-error swap the output ports for this action
    blueprint.outputs = outputs;

    return blueprint;
};
