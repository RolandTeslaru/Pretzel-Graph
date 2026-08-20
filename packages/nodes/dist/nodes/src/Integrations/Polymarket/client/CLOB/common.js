"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POLYMARKET_CLOB_BASE_URL = void 0;
exports.assertPatched = assertPatched;
exports.createUnauthenticatedClobSDK = createUnauthenticatedClobSDK;
exports.createReadOnlyClobSDK = createReadOnlyClobSDK;
exports.createAuthenticatedClobSDK = createAuthenticatedClobSDK;
const clob_client_v2_1 = require("@polymarket/clob-client-v2");
const viem_1 = require("viem");
const accounts_1 = require("viem/accounts");
const chains_1 = require("viem/chains");
const domain_1 = require("../../domain");
exports.POLYMARKET_CLOB_BASE_URL = "https://clob.polymarket.com";
function createSigner(privateKey) {
    const normalizedPrivateKey = privateKey.startsWith("0x")
        ? privateKey
        : `0x${privateKey}`;
    const account = (0, accounts_1.privateKeyToAccount)(normalizedPrivateKey);
    return (0, viem_1.createWalletClient)({
        account,
        chain: chains_1.polygon,
        transport: (0, viem_1.http)(),
    });
}
function createWalletOptions(credentials) {
    return {
        host: exports.POLYMARKET_CLOB_BASE_URL,
        chain: clob_client_v2_1.Chain.POLYGON,
        signer: createSigner(credentials.privateKey),
        signatureType: domain_1.Polymarket.CLOB.Common.SignatureType.parse(Number(credentials.signatureType)),
        funderAddress: credentials.funderAddress,
        useServerTime: true,
        throwOnError: true,
        retryOnError: true,
    };
}
// The CLOB SDK has no transport hook of its own — it calls the bare axios default export.
// patches/@polymarket+clob-client-v2+1.1.0.patch adds `axiosInstance`, which is how the
// node's proxy agent reaches CLOB traffic. Always build it from `RuntimeNode.httpClientFactory`.
function createTransport(http) {
    return http.create({
        vendor: "Polymarket",
        baseURL: exports.POLYMARKET_CLOB_BASE_URL,
    }).raw;
}
// An unpatched ClobClient silently drops `axiosInstance` — no error, just direct egress.
// patch-package runs from `postinstall`, so `npm ci --ignore-scripts` skips it. Fail at
// construction rather than leaking the worker's real IP to a geo-fenced venue.
function assertPatched(client, transport) {
    if (client.axiosInstance === transport)
        return;
    throw new Error("Polymarket CLOB: the clob-client-v2 patch is not applied, so requests would bypass "
        + "this node's proxy. Run `npx patch-package` (it is skipped by `npm ci --ignore-scripts`).");
}
function createUnauthenticatedClobSDK(http) {
    const transport = createTransport(http);
    const client = new clob_client_v2_1.ClobClient({
        host: exports.POLYMARKET_CLOB_BASE_URL,
        chain: clob_client_v2_1.Chain.POLYGON,
        throwOnError: true,
        retryOnError: true,
        axiosInstance: transport,
    });
    assertPatched(client, transport);
    return client;
}
// L2 requests carry an HMAC built from the API secret; the SDK consults the signer for exactly one
// thing, POLY_ADDRESS (see createL2Headers). So reading an account needs the address, not the key.
// Signing throws rather than being unimplemented — a read-only client that somehow reached an order
// path fails loudly instead of quietly egressing an unsigned request.
function createReadOnlySigner(address) {
    return {
        account: {
            address: domain_1.Polymarket.CLOB.Common.WalletAddress.parse(address),
        },
        signTypedData: () => {
            throw new Error("Polymarket: this client holds an API key but no wallet key — it can read, not sign.");
        },
    };
}
function createReadOnlyClobSDK(credentials, http) {
    const transport = createTransport(http);
    const client = new clob_client_v2_1.ClobClient({
        host: exports.POLYMARKET_CLOB_BASE_URL,
        chain: clob_client_v2_1.Chain.POLYGON,
        signer: createReadOnlySigner(credentials.signerAddress),
        creds: {
            key: credentials.apiKey,
            secret: credentials.apiSecret,
            passphrase: credentials.passphrase,
        },
        useServerTime: true,
        throwOnError: true,
        retryOnError: true,
        axiosInstance: transport,
    });
    assertPatched(client, transport);
    return client;
}
function createAuthenticatedClobSDK(credentials, http) {
    const apiCredentials = {
        key: credentials.apiKey,
        secret: credentials.apiSecret,
        passphrase: credentials.passphrase,
    };
    const transport = createTransport(http);
    const client = new clob_client_v2_1.ClobClient({
        ...createWalletOptions(credentials),
        creds: apiCredentials,
        axiosInstance: transport,
    });
    assertPatched(client, transport);
    return client;
}
