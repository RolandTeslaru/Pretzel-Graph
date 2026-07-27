import {
    Chain,
    ClobClient,
    SignatureTypeV2,
    type ApiKeyCreds,
} from "@polymarket/clob-client-v2"
import type { AxiosInstance } from "axios"
import type { HTTP } from "@pretzel-graph/node-sdk"
import {
    createWalletClient,
    http as createViemHTTPTransport,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { polygon } from "viem/chains"

import { Polymarket } from "../../domain"

export const POLYMARKET_CLOB_BASE_URL = "https://clob.polymarket.com"

export type PolymarketCLOBWalletCredentials = {
    privateKey:    string
    funderAddress: string
    signatureType: Polymarket.CLOB.Common.SignatureType | `${Polymarket.CLOB.Common.SignatureType}`
}

export type PolymarketCLOBApiCredentials = {
    apiKey:     string
    apiSecret:  string
    passphrase: string
}

/** L2 alone. The address stands in for the key it can't hold — see createReadOnlySigner. */
export type PolymarketCLOBReadOnlyCredentials =
    PolymarketCLOBApiCredentials & {
        signerAddress: string
    }

export type PolymarketCLOBCredentials =
    PolymarketCLOBWalletCredentials & PolymarketCLOBApiCredentials

function createSigner(privateKey: string) {
    const normalizedPrivateKey = privateKey.startsWith("0x")
        ? privateKey
        : `0x${privateKey}`
    const account = privateKeyToAccount(
        normalizedPrivateKey as `0x${string}`,
    )

    return createWalletClient({
        account,
        chain:     polygon,
        transport: createViemHTTPTransport(),
    })
}

function createWalletOptions(
    credentials: PolymarketCLOBWalletCredentials,
) {
    return {
        host:          POLYMARKET_CLOB_BASE_URL,
        chain:         Chain.POLYGON,
        signer:        createSigner(credentials.privateKey),
        signatureType: Polymarket.CLOB.Common.SignatureType.parse(
            Number(credentials.signatureType),
        ) as SignatureTypeV2,
        funderAddress: credentials.funderAddress,
        useServerTime: true,
        throwOnError:  true,
        retryOnError:  true,
    } as const
}

// The CLOB SDK has no transport hook of its own — it calls the bare axios default export.
// patches/@polymarket+clob-client-v2+1.1.0.patch adds `axiosInstance`, which is how the
// node's proxy agent reaches CLOB traffic. Always build it from `RuntimeNode.httpClientFactory`.
function createTransport(http: HTTP.ClientAPI) {
    return http.create({
        vendor:  "Polymarket",
        baseURL: POLYMARKET_CLOB_BASE_URL,
    }).raw
}

// An unpatched ClobClient silently drops `axiosInstance` — no error, just direct egress.
// patch-package runs from `postinstall`, so `npm ci --ignore-scripts` skips it. Fail at
// construction rather than leaking the worker's real IP to a geo-fenced venue.
export function assertPatched(client: ClobClient, transport: AxiosInstance) {
    if (client.axiosInstance === transport)
        return

    throw new Error(
        "Polymarket CLOB: the clob-client-v2 patch is not applied, so requests would bypass "
        + "this node's proxy. Run `npx patch-package` (it is skipped by `npm ci --ignore-scripts`).",
    )
}

export function createUnauthenticatedClobSDK(http: HTTP.ClientAPI) {
    const transport = createTransport(http)

    const client = new ClobClient({
        host:          POLYMARKET_CLOB_BASE_URL,
        chain:         Chain.POLYGON,
        throwOnError:  true,
        retryOnError:  true,
        axiosInstance: transport,
    })

    assertPatched(client, transport)

    return client
}

// L2 requests carry an HMAC built from the API secret; the SDK consults the signer for exactly one
// thing, POLY_ADDRESS (see createL2Headers). So reading an account needs the address, not the key.
// Signing throws rather than being unimplemented — a read-only client that somehow reached an order
// path fails loudly instead of quietly egressing an unsigned request.
function createReadOnlySigner(address: string) {
    return {
        account: {
            address: Polymarket.CLOB.Common.WalletAddress.parse(address),
        },
        signTypedData: () => {
            throw new Error(
                "Polymarket: this client holds an API key but no wallet key — it can read, not sign.",
            )
        },
    } as unknown as ClobClient["signer"]
}

export function createReadOnlyClobSDK(
    credentials: PolymarketCLOBReadOnlyCredentials,
    http: HTTP.ClientAPI,
) {
    const transport = createTransport(http)

    const client = new ClobClient({
        host:          POLYMARKET_CLOB_BASE_URL,
        chain:         Chain.POLYGON,
        signer:        createReadOnlySigner(credentials.signerAddress),
        creds: {
            key:        credentials.apiKey,
            secret:     credentials.apiSecret,
            passphrase: credentials.passphrase,
        },
        useServerTime: true,
        throwOnError:  true,
        retryOnError:  true,
        axiosInstance: transport,
    })

    assertPatched(client, transport)

    return client
}

export function createAuthenticatedClobSDK(
    credentials: PolymarketCLOBCredentials,
    http: HTTP.ClientAPI,
) {
    const apiCredentials: ApiKeyCreds = {
        key:        credentials.apiKey,
        secret:     credentials.apiSecret,
        passphrase: credentials.passphrase,
    }

    const transport = createTransport(http)

    const client = new ClobClient({
        ...createWalletOptions(credentials),
        creds:         apiCredentials,
        axiosInstance: transport,
    })

    assertPatched(client, transport)

    return client
}
