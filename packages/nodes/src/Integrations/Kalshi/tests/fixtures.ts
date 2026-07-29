import type {
    EventData,
    Market,
    Series,
    Trade,
} from "kalshi-typescript"


export const market = (overrides: Partial<Market> = {}): Market => ({
    ticker:      "KXTEST-26-YES",
    event_ticker: "KXTEST-26",
    market_type: "binary",

    yes_sub_title: "Yes",
    no_sub_title:  "No",

    created_time: "2026-01-01T00:00:00Z",
    updated_time: "2026-01-02T00:00:00Z",
    open_time:    "2026-01-01T00:00:00Z",
    close_time:   "2026-12-31T00:00:00Z",
    latest_expiration_time: "2027-01-01T00:00:00Z",
    settlement_timer_seconds: 3_600,

    status: "active",

    yes_bid_dollars:      "0.4200",
    yes_bid_size_fp:      "10.00",
    yes_ask_dollars:      "0.4400",
    yes_ask_size_fp:      "8.00",
    no_bid_dollars:       "0.5600",
    no_ask_dollars:       "0.5800",
    last_price_dollars:   "0.4300",
    previous_yes_bid_dollars: "0.4100",
    previous_yes_ask_dollars: "0.4500",
    previous_price_dollars:   "0.4200",

    volume_fp:        "1200.50",
    volume_24h_fp:    "150.25",
    open_interest_fp: "800.00",

    result:          "",
    can_close_early: false,

    notional_value_dollars: "1.0000",
    expiration_value:       "",

    rules_primary:   "The market settles Yes when the event occurs.",
    rules_secondary: "",

    price_level_structure: "linear_cent",
    price_ranges: [{ start: "0.0000", end: "1.0000", step: "0.0100" }],

    ...overrides,
})


export const event = (overrides: Partial<EventData> = {}): EventData => ({
    event_ticker:  "KXTEST-26",
    series_ticker: "KXTEST",
    sub_title:     "Test event",
    title:         "Will the test happen?",

    collateral_return_type: "binary",
    mutually_exclusive:     true,
    available_on_brokers:   true,
    settlement_sources:     [{ name: "Official source", url: "https://example.com" }],
    markets:                [market()],

    ...overrides,
})


export const series = (overrides: Partial<Series> = {}): Series => ({
    ticker:    "KXTEST",
    frequency: "annual",
    title:     "Test series",
    category:  "Other",
    tags:      ["test"],

    settlement_sources: [{ name: "Official source", url: "https://example.com" }],
    contract_url:       "https://example.com/contract",
    contract_terms_url: "https://example.com/terms",

    fee_type:       "quadratic",
    fee_multiplier: 1,
    additional_prohibitions: [],

    ...overrides,
})


export const trade = (overrides: Partial<Trade> = {}): Trade => ({
    trade_id: "trade-1",
    ticker:   "KXTEST-26-YES",

    count_fp:         "2.50",
    yes_price_dollars: "0.4200",
    no_price_dollars:  "0.5800",

    taker_outcome_side: "yes",
    taker_book_side:    "bid",

    created_time:   "2026-06-01T12:00:00Z",
    is_block_trade: false,

    ...overrides,
})
