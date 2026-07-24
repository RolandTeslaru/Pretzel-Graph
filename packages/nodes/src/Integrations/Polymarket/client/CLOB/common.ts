import {
    Chain,
    ClobClient,
    SignatureTypeV2,
    type ApiKeyCreds,
} from "@polymarket/clob-client-v2"
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

export type PolymarketCLOBCredentials =
    PolymarketCLOBWalletCredentials & {
        apiKey:    string
        apiSecret: string
        passphrase: string
    }

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

export function createUnauthenticatedClobSDK() {
    return new ClobClient({
        host:         POLYMARKET_CLOB_BASE_URL,
        chain:        Chain.POLYGON,
        throwOnError: true,
        retryOnError: true,
    })
}

export function createAuthenticatedClobSDK(
    credentials: PolymarketCLOBCredentials,
) {
    const apiCredentials: ApiKeyCreds = {
        key:        credentials.apiKey,
        secret:     credentials.apiSecret,
        passphrase: credentials.passphrase,
    }

    return new ClobClient({
        ...createWalletOptions(credentials),
        creds: apiCredentials,
    })
}
