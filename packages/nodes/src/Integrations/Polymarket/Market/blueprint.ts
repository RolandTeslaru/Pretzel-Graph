import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

import { MarketAction } from "./actions";
import { OPERATIONS, statusOptions } from "./fields";

// Reconcilers only ever see reconcile-field values off the BASE blueprint, so every
// selector in the cascade has to live here even when it isn't on the active branch.
// Off-branch ones are hidden so the un-reconciled base renders as its own defaults
// (action=search, searchKind=markets) rather than as all ten selectors at once.
const selector = (
    id: string,
    displayName: string,
    options: readonly { value: string, displayName?: string, description?: string }[],
    initialValue: string,
    tooltip: string,
    hidden = false,
) => FieldBuilder.reconciling(FieldBuilder.MultiOption(id, displayName, {
    options,
    initialValue,
    tooltip,
    hidden,
}));

export const Blueprint = defineBlueprint({
    id: "Integrations.Polymarket.Market",
    displayName: "Polymarket Market",
    description: "Reads Polymarket prediction-market data: markets, events, tags, series, order books, prices and trade analytics.",
    icon: "Polymarket",
    proxyCompatible: true,
    accent: "port-DataList",
    toolCompatible: true,
    fields: [
        selector("action", "Action", MarketAction.Options, MarketAction.Default,
            "What kind of request to make."),

        selector("searchKind", "Search", MarketAction.SearchKind.Options, MarketAction.SearchKind.Default,
            "Which index to search."),

        selector("listAPI", "Source", MarketAction.ListAPI.Options, MarketAction.ListAPI.Default,
            "Which Polymarket API to list from.", true),
        selector("listGammaKind", "Records", MarketAction.ListGammaKind.Options, MarketAction.ListGammaKind.Default,
            "Which metadata records to list.", true),
        selector("listClobKind", "Records", MarketAction.ListClobKind.Options, MarketAction.ListClobKind.Default,
            "Which exchange records to list.", true),
        selector("listDataKind", "Records", MarketAction.ListDataKind.Options, MarketAction.ListDataKind.Default,
            "Which analytics records to list.", true),

        selector("getAPI", "Source", MarketAction.GetAPI.Options, MarketAction.GetAPI.Default,
            "Which Polymarket API to fetch from.", true),
        selector("getGammaKind", "Resource", MarketAction.GetGammaKind.Options, MarketAction.GetGammaKind.Default,
            "Which metadata resource to fetch.", true),
        selector("getClobKind", "Resource", MarketAction.GetClobKind.Options, MarketAction.GetClobKind.Default,
            "Which exchange view to fetch.", true),
        selector("getDataKind", "Resource", MarketAction.GetDataKind.Options, MarketAction.GetDataKind.Default,
            "Which analytic to fetch.", true),

        ...OPERATIONS.searchMarkets.fields(),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.DataList("markets", "Markets", {
            tooltip: "Matching markets with outcomes, outcome prices and CLOB token ids.",
        }),
    ],
});


export const ToolBlueprint = defineBlueprint({
    id: "Integrations.Polymarket.Market",
    displayName: "Polymarket Market",
    description: "Exposes Polymarket market-data tools to an agent as a toolkit.",
    icon: "Polymarket",
    proxyCompatible: true,
    accent: "port-ToolList",
    toolCompatible: true,
    fields: [
        FieldBuilder.MultiOption("status", "Default Status", {
            options: statusOptions,
            initialValue: "active",
            tooltip: "Default status filter used by the search tool when the agent doesn't specify one.",
        }),
        FieldBuilder.Integer("maxResults", "Default Max Results", {
            initialValue: 20,
            min: 1,
            max: 500,
            tooltip: "Default result cap used by the list/search tools when the agent doesn't specify one.",
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.ToolList("tools", "Polymarket Tools", {
            tooltip: "Toolkit: polymarket_search_markets, polymarket_get_market, polymarket_get_events, polymarket_get_midpoint, polymarket_get_order_book.",
        }),
    ],
});
