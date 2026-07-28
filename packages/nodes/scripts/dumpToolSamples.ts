/**
 * Calls every Polymarket tool against the live API and writes what the model would actually
 * receive to `tool-samples/` in the repo root, one file per tool.
 *
 *     cd packages/nodes && npx tsx scripts/dumpToolSamples.ts
 *
 * Arguments are deliberately left at their schema defaults wherever a tool has them, so a sample
 * is the size a model really gets — not a small one produced by passing limit: 5.
 *
 * Honours HTTPS_PROXY / HTTP_PROXY (axios reads them in Node), so it works through the gluetun rig.
 * Account tools are skipped unless POLYMARKET_API_KEY, POLYMARKET_API_SECRET,
 * POLYMARKET_PASSPHRASE and POLYMARKET_SIGNER_ADDRESS are all set.
 */
import "reflect-metadata"

import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import axios from "axios"
import type { HTTP } from "@pretzel-graph/node-sdk"

import { PolymarketReadOnlyCLOBClient } from "../src/Integrations/Polymarket/client"
import { PolymarketGammaClient } from "../src/Integrations/Polymarket/client"
import { PolymarketPublicSDK } from "../src/Integrations/Polymarket/sdk"
import { buildTools as buildAccountTools } from "../src/Integrations/Polymarket/Account/tools"
import { buildTools as buildMarketTools } from "../src/Integrations/Polymarket/Market/tools"
import { buildTools as buildProfileTools } from "../src/Integrations/Polymarket/Profile/tools"


const OUT_DIR = resolve(fileURLToPath(new URL("../../..", import.meta.url)), "tool-samples")

// A wallet with ordinary trading history, so profile samples are representative. The whale from
// the 2028 trace has 100+ positions and is not a typical case.
const WALLET = process.env.POLYMARKET_SAMPLE_WALLET
    ?? "0x56687bf447db6ffa42ffe2204a05edaa20f55839"


const http: HTTP.ClientAPI = {
    create: (config = {}) => {
        const instance = axios.create({
            ...config,
            timeout: 30_000,
        })

        const body = <T>(promise: Promise<{ data: T }>) => promise.then(response => response.data)

        return {
            get:    (url, c) => body(instance.get(url, c)),
            post:   (url, d, c) => body(instance.post(url, d, c)),
            put:    (url, d, c) => body(instance.put(url, d, c)),
            patch:  (url, d, c) => body(instance.patch(url, d, c)),
            delete: (url, c) => body(instance.delete(url, c)),
            raw:    instance,
        } as HTTP.Client
    },
}


type Sample = {
    tool:    string
    args:    Record<string, unknown>
    bytes:   number
    items?:  number
    perItem?: number
    error?:  string
    result?: unknown
}


const bytes = (text: string) => Buffer.byteLength(text, "utf8")

// Tool returns are JSON strings. Count whichever array the payload is built around, so the report
// can rank by cost per item rather than only by total.
const countItems = (payload: unknown): number | undefined => {
    if (Array.isArray(payload))
        return payload.length

    if (typeof payload !== "object" || payload === null)
        return undefined

    const record = payload as Record<string, unknown>

    if (typeof record.count === "number")
        return record.count

    const arrays = Object.values(record).filter(Array.isArray) as unknown[][]

    return arrays.length === 1 ? arrays[0].length : undefined
}


async function run(
    tools: ReturnType<typeof buildMarketTools>,
    name:  string,
    args:  Record<string, unknown>,
): Promise<Sample> {

    const tool = tools.find(candidate => candidate.name === name)

    if (!tool)
        return { tool: name, args, bytes: 0, error: "tool not found" }

    try {
        const output = await tool.invoke(args) as string
        const parsed = JSON.parse(output) as unknown
        const items  = countItems(parsed)

        return {
            tool:  name,
            args,
            bytes: bytes(output),
            ...(items !== undefined
                ? { items, perItem: Math.round(bytes(output) / Math.max(items, 1)) }
                : {}),
            result: parsed,
        }
    }
    catch (error) {
        return {
            tool:  name,
            args,
            bytes: 0,
            error: error instanceof Error ? error.message : String(error),
        }
    }
}


async function main() {
    const polymarket = new PolymarketPublicSDK(http)

    const marketTools  = buildMarketTools(polymarket)
    const profileTools = buildProfileTools(polymarket)

    const rawGamma = new PolymarketGammaClient(http)

    // Discovery pass: the id-taking tools need real ids, and which ids are live changes daily.
    console.log("resolving sample ids…")

    const events = await rawGamma.events.list({ active: true, closed: false, limit: 20, order: "volume", ascending: false })
    const event  = events.find(candidate =>
        candidate.markets?.some(market => market.conditionId && market.clobTokenIds?.length))
        ?? events[0]

    const market  = event?.markets?.find(candidate => candidate.conditionId && candidate.clobTokenIds?.length)
    const tokenId = market?.clobTokenIds?.[0] ?? ""
    const seriesList = await rawGamma.series.list({ limit: 1 })
    const tags       = await rawGamma.tags.list({ limit: 1 })

    const ids = {
        eventId:     String(event?.id ?? ""),
        eventSlug:   String(event?.slug ?? ""),
        marketSlug:  String(market?.slug ?? ""),
        conditionId: String(market?.conditionId ?? ""),
        tokenId:     String(tokenId),
        seriesId:    String(seriesList[0]?.id ?? ""),
        tagSlug:     String(tags[0]?.slug ?? ""),
    }

    console.log(ids)

    const samples: Sample[] = []

    // Defaults left in place on purpose — this is what a model actually gets back.
    const marketCalls: Array<[string, Record<string, unknown>]> = [
        ["polymarket_search_markets",        { query: "election" }],
        ["polymarket_search_all",            { query: "election" }],
        ["polymarket_list_markets",          {}],
        ["polymarket_get_market",            { identifier: ids.marketSlug }],
        ["polymarket_list_events",           {}],
        ["polymarket_get_event",             { identifier: ids.eventSlug }],
        ["polymarket_list_tags",             {}],
        ["polymarket_get_tag",               { identifier: ids.tagSlug }],
        ["polymarket_list_series",           {}],
        ["polymarket_get_series",            { seriesId: ids.seriesId }],
        ["polymarket_list_sports",           {}],
        ["polymarket_list_teams",            {}],
        ["polymarket_list_trades",           { conditionId: ids.conditionId }],
        ["polymarket_list_holders",          { conditionId: ids.conditionId }],
        ["polymarket_get_price",             { tokenId: ids.tokenId }],
        ["polymarket_get_order_book",        { tokenId: ids.tokenId }],
        ["polymarket_get_price_history",     { tokenId: ids.tokenId }],
        ["polymarket_get_market_mechanics",  { tokenId: ids.tokenId }],
        ["polymarket_get_market_config",     { conditionId: ids.conditionId }],
        ["polymarket_get_market_rewards",    { conditionId: ids.conditionId }],
        ["polymarket_get_open_interest",     { conditionId: ids.conditionId }],
        ["polymarket_get_live_volume",       { eventId: ids.eventId }],
    ]

    for (const [name, args] of marketCalls)
        samples.push(await run(marketTools, name, args))

    const profileCalls: Array<[string, Record<string, unknown>]> = [
        ["polymarket_profile_identity",         { wallet: WALLET }],
        ["polymarket_profile_positions",        { wallet: WALLET }],
        ["polymarket_profile_closed_positions", { wallet: WALLET }],
        ["polymarket_profile_activity",         { wallet: WALLET }],
        ["polymarket_profile_value",            { wallet: WALLET }],
        ["polymarket_profile_markets_traded",   { wallet: WALLET }],
        ["polymarket_profile_rank",             { wallet: WALLET }],
    ]

    for (const [name, args] of profileCalls)
        samples.push(await run(profileTools, name, args))

    const credentials = {
        signerAddress: process.env.POLYMARKET_SIGNER_ADDRESS ?? "",
        apiKey:        process.env.POLYMARKET_API_KEY ?? "",
        apiSecret:     process.env.POLYMARKET_API_SECRET ?? "",
        passphrase:    process.env.POLYMARKET_PASSPHRASE ?? "",
    }

    if (Object.values(credentials).every(Boolean)) {
        const accountTools = buildAccountTools(new PolymarketReadOnlyCLOBClient(credentials, http))

        const accountCalls: Array<[string, Record<string, unknown>]> = [
            ["polymarket_account_open_orders", {}],
            ["polymarket_account_trades",      {}],
            ["polymarket_account_balance",     {}],
            ["polymarket_account_settings",    {}],
            ["polymarket_account_rewards",     { view: "percentages" }],
        ]

        for (const [name, args] of accountCalls)
            samples.push(await run(accountTools, name, args))
    }
    else
        console.log("skipping account tools — POLYMARKET_API_KEY/SECRET/PASSPHRASE/SIGNER_ADDRESS not set")

    write(samples)
}


function write(samples: Sample[]) {
    mkdirSync(OUT_DIR, { recursive: true })

    for (const sample of samples)
        writeFileSync(
            resolve(OUT_DIR, `${sample.tool}.json`),
            `${JSON.stringify(sample, null, 2)}\n`,
        )

    const ranked = [...samples].sort((left, right) => right.bytes - left.bytes)

    const rows = ranked.map(sample => {
        const size = sample.error
            ? `— (${sample.error.slice(0, 60)})`
            : `${sample.bytes.toLocaleString()} B`

        return `| \`${sample.tool}\` | ${size} | ${sample.items ?? ""} | ${sample.perItem ?? ""} |`
    })

    const total = samples.reduce((sum, sample) => sum + sample.bytes, 0)

    writeFileSync(
        resolve(OUT_DIR, "README.md"),
        [
            "# Polymarket tool samples",
            "",
            `Generated by \`packages/nodes/scripts/dumpToolSamples.ts\` on ${new Date().toISOString()}.`,
            "",
            "Each file is one tool's serialized return, exactly as a model receives it, with the",
            "arguments used and its size. Arguments are left at schema defaults so sizes are real.",
            "",
            `Total across ${samples.length} tools: **${total.toLocaleString()} bytes**.`,
            "",
            "| tool | bytes | items | bytes/item |",
            "|---|---:|---:|---:|",
            ...rows,
            "",
        ].join("\n"),
    )

    console.log(`\nwrote ${samples.length} samples to ${OUT_DIR}`)
    console.log(`total ${total.toLocaleString()} bytes`)

    for (const sample of ranked.slice(0, 10))
        console.log(
            `  ${sample.bytes.toString().padStart(7)} B  ${sample.tool}`
            + (sample.perItem ? `  (${sample.items} items, ${sample.perItem} B each)` : "")
            + (sample.error ? `  ERROR: ${sample.error.slice(0, 70)}` : ""),
        )
}


void main().catch(error => {
    console.error(error)
    process.exit(1)
})
