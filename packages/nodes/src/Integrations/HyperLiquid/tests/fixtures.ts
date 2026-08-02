export const candle = (overrides: Record<string, unknown> = {}) => ({
    t: 1_000,
    T: 1_999,
    s: "BTC",
    i: "1h",
    o: "100.0",
    c: "110.0",
    h: "115.0",
    l: "95.0",
    v: "12.5",
    n: 42,
    ...overrides,
});


export const orderBook = () => ({
    coin: "BTC",
    time: 2_000,
    levels: [
        [
            { px: "99.0",  sz: "1.0", n: 1 },
            { px: "100.0", sz: "2.0", n: 2 },
        ],
        [
            { px: "102.0", sz: "3.0", n: 3 },
            { px: "101.0", sz: "4.0", n: 4 },
        ],
    ],
});


export const perpetualMeta = () => ([
    {
        universe: [
            { name: "BTC", szDecimals: 5, maxLeverage: 40, marginTableId: 56 },
            { name: "ETH", szDecimals: 4, maxLeverage: 25 },
        ],
    },
    [
        {
            funding: "0.0001", openInterest: "10", prevDayPx: "90",
            dayNtlVlm: "1000", dayBaseVlm: "10", premium: "0.001",
            oraclePx: "101", markPx: "100", midPx: "100.5", impactPxs: ["100", "101"],
        },
        {
            funding: "0.0002", openInterest: "20", prevDayPx: "190",
            dayNtlVlm: "2000", dayBaseVlm: "11", premium: "0.002",
            oraclePx: "201", markPx: "200", midPx: "200.5", impactPxs: ["200", "201"],
        },
    ],
]);


export const spotMeta = () => ([
    {
        tokens: [
            {
                name: "USDC", szDecimals: 8, weiDecimals: 8, index: 0,
                tokenId: "0xusdc", isCanonical: true, fullName: null,
            },
            {
                name: "PURR", szDecimals: 0, weiDecimals: 5, index: 1,
                tokenId: "0xpurr", isCanonical: true, fullName: "Purr",
            },
        ],
        universe: [
            { name: "PURR/USDC", tokens: [1, 0], index: 0, isCanonical: true },
        ],
    },
    [
        {
            coin: "PURR/USDC", prevDayPx: "0.1", dayNtlVlm: "100",
            dayBaseVlm: "1000", markPx: "0.11", midPx: "0.105",
            circulatingSupply: "1000000", totalSupply: "1100000",
        },
    ],
]);


export const clearinghouseState = () => ({
    marginSummary: {
        accountValue: "100", totalMarginUsed: "10", totalNtlPos: "20", totalRawUsd: "90",
    },
    crossMarginSummary: {
        accountValue: "100", totalMarginUsed: "10", totalNtlPos: "20", totalRawUsd: "90",
    },
    crossMaintenanceMarginUsed: "5",
    withdrawable: "80",
    assetPositions: [],
    time: 3_000,
});
