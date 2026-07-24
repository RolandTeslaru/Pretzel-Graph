import assert from "node:assert/strict"
import { test } from "node:test"

import { Polymarket } from "../domain"

const LIVE = process.env.POLYMARKET_LIVE_TESTS === "1"

const GAMMA_BASE_URL = "https://gamma-api.polymarket.com"
const DATA_BASE_URL   = "https://data-api.polymarket.com"
const CLOB_BASE_URL   = "https://clob.polymarket.com"

const USER = "0x56687bf447db6ffa42ffe2204a05edaa20f55839"

async function getJSON(url: string): Promise<unknown> {
    const response = await fetch(url, {
        signal: AbortSignal.timeout(15_000),
    })

    assert.equal(
        response.ok,
        true,
        `${response.status} ${response.statusText}: ${url}`,
    )

    return response.json()
}

async function getActiveEvent() {
    const response = await getJSON(
        `${GAMMA_BASE_URL}/events?active=true&closed=false&limit=5`,
    )
    const events = Polymarket.Gamma.API.Events.List.Response.parse(response)

    assert.ok(events.length > 0)

    return events.find((event) =>
        event.markets?.some((market) =>
            market.enableOrderBook &&
            market.conditionId &&
            market.clobTokenIds,
        ),
    ) ?? events[0]
}

test(
    "live Gamma responses satisfy local contracts",
    { skip: !LIVE },
    async () => {
        const event = await getActiveEvent()

        assert.ok(event.id)

        const byId = await getJSON(
            `${GAMMA_BASE_URL}/events/${encodeURIComponent(event.id)}`,
        )

        Polymarket.Gamma.API.Events.GetById.Response.parse(byId)
    },
)

test(
    "live Data responses satisfy local contracts",
    { skip: !LIVE },
    async () => {
        const [status, positions, activity, leaderboard, openInterest] =
            await Promise.all([
                getJSON(`${DATA_BASE_URL}/`),
                getJSON(
                    `${DATA_BASE_URL}/positions?user=${USER}&limit=2`,
                ),
                getJSON(
                    `${DATA_BASE_URL}/activity?user=${USER}&type=REWARD&limit=2`,
                ),
                getJSON(`${DATA_BASE_URL}/v1/leaderboard?limit=2`),
                getJSON(`${DATA_BASE_URL}/oi`),
            ])

        Polymarket.Data.API.Status.Get.Response.parse(status)
        Polymarket.Data.API.Positions.ListCurrent.Response.parse(positions)
        Polymarket.Data.API.Activity.List.Response.parse(activity)
        Polymarket.Data.API.Leaderboard.List.Response.parse(leaderboard)
        Polymarket.Data.API.Markets.GetOpenInterest.Response.parse(
            openInterest,
        )
    },
)

test(
    "live public CLOB responses satisfy local contracts",
    { skip: !LIVE },
    async () => {
        const marketsResponse = await getJSON(
            `${CLOB_BASE_URL}/sampling-markets?next_cursor=MA%3D%3D`,
        )
        const markets =
            Polymarket.CLOB.API.Markets.ListSampling.Response.parse(
                marketsResponse,
            )
        const market = markets.data.find((candidate) =>
            candidate.enable_order_book &&
            candidate.accepting_orders &&
            candidate.tokens.length > 0,
        )

        assert.ok(market)

        const [time, marketResponse, book] = await Promise.all([
            getJSON(`${CLOB_BASE_URL}/time`),
            getJSON(
                `${CLOB_BASE_URL}/markets/${encodeURIComponent(market.condition_id)}`,
            ),
            getJSON(
                `${CLOB_BASE_URL}/book?token_id=${encodeURIComponent(market.tokens[0].token_id)}`,
            ),
        ])

        Polymarket.CLOB.API.System.Time.Response.parse(time)
        Polymarket.CLOB.API.Markets.Get.Response.parse(marketResponse)
        Polymarket.CLOB.API.MarketData.GetOrderBook.Response.parse(book)
    },
)
