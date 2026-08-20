"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Search = exports.Sport = exports.Team = exports.Comment = exports.Reaction = exports.Profile = exports.Event = exports.Series = exports.Market = exports.FeeSchedule = exports.Category = exports.TagRelationship = exports.Tag = exports.Image = exports.Common = void 0;
const zod_1 = require("zod");
var Common;
(function (Common) {
    Common.DateTime = zod_1.z.string();
    // Gamma is inconsistent about whether its scoreboard and identifier fields are quoted — the
    // same `gameId` comes back as a string on one event and a number on the next. These are
    // display-only, so a type mismatch on one row of a hundred used to fail the whole list and
    // take the tool down with it. Accept either and normalise.
    Common.LooseString = zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).transform(String);
    // Gamma reports the same quantity as a string on one key and a number on its `…Num` twin —
    // `volume` vs `volumeNum`. Normalising at the wire boundary means nothing downstream has to
    // remember which is which. Deliberately not z.coerce: that turns "" into 0, which reads as a
    // real zero rather than "unknown", and junk into NaN, which z.number() then rejects — failing
    // a whole market over one bad field, exactly how a numeric `gameId` took list_events down.
    Common.LooseNumber = zod_1.z
        .union([zod_1.z.number(), zod_1.z.string(), zod_1.z.null()])
        .transform(value => {
        if (value === null || value === "")
            return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    });
    Common.WalletAddress = zod_1.z.string().regex(/^0x[a-fA-F0-9]{40}$/);
    Common.LegacyPagination = zod_1.z.object({
        // Gamma caps these list endpoints at 500, and a limit of 0 returns nothing — bounding
        // here means callers hand over a raw field value instead of pre-clamping it.
        limit: zod_1.z.number().int().min(1).max(500).optional(),
        offset: zod_1.z.number().int().min(0).optional(),
        order: zod_1.z.string().optional(),
        ascending: zod_1.z.boolean().optional(),
    });
    Common.KeysetPagination = zod_1.z.object({
        limit: zod_1.z.number().int().min(1).optional(),
        order: zod_1.z.string().optional(),
        ascending: zod_1.z.boolean().optional(),
        after_cursor: zod_1.z.string().optional(),
    });
    Common.DateRange = zod_1.z.object({
        start_date_min: Common.DateTime.optional(),
        start_date_max: Common.DateTime.optional(),
        end_date_min: Common.DateTime.optional(),
        end_date_max: Common.DateTime.optional(),
    });
})(Common || (exports.Common = Common = {}));
/**
 * Gamma evolves independently of PretzelGraph. Entity schemas intentionally pass
 * through unknown keys while strongly describing the stable, useful surface.
 */
var Image;
(function (Image) {
    Image.Schema = zod_1.z
        .object({
        id: zod_1.z.string().nullish(),
        imageUrlSource: zod_1.z.string().nullish(),
        imageUrlOptimized: zod_1.z.string().nullish(),
        imageSizeKbSource: zod_1.z.number().nullish(),
        imageSizeKbOptimized: zod_1.z.number().nullish(),
        imageOptimizedComplete: zod_1.z.boolean().nullish(),
        imageOptimizedLastUpdated: zod_1.z.string().nullish(),
        relID: zod_1.z.number().nullish(),
        field: zod_1.z.string().nullish(),
        relname: zod_1.z.string().nullish(),
    })
        .loose();
})(Image || (exports.Image = Image = {}));
var Tag;
(function (Tag) {
    Tag.Id = zod_1.z.coerce.string().trim().brand("PolymarketGammaTagId");
    Tag.Schema = zod_1.z
        .object({
        id: Tag.Id,
        label: zod_1.z.string().nullish(),
        slug: zod_1.z.string().nullish(),
        forceShow: zod_1.z.boolean().nullish(),
        forceHide: zod_1.z.boolean().nullish(),
        isCarousel: zod_1.z.boolean().nullish(),
        publishedAt: zod_1.z.string().nullish(),
        createdBy: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).nullish(),
        updatedBy: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).nullish(),
        createdAt: zod_1.z.string().nullish(),
        updatedAt: zod_1.z.string().nullish(),
        requiresTranslation: zod_1.z.boolean().nullish(),
        event_count: zod_1.z.number().nullish(),
    })
        .loose();
})(Tag || (exports.Tag = Tag = {}));
var TagRelationship;
(function (TagRelationship) {
    TagRelationship.Schema = zod_1.z
        .object({
        id: zod_1.z.string().nullish(),
        tagID: zod_1.z.number().nullish(),
        relatedTagID: zod_1.z.number().nullish(),
        rank: zod_1.z.number().nullish(),
    })
        .loose();
})(TagRelationship || (exports.TagRelationship = TagRelationship = {}));
var Category;
(function (Category) {
    Category.Schema = zod_1.z
        .object({
        id: zod_1.z.string().nullish(),
        label: zod_1.z.string().nullish(),
        parentCategory: zod_1.z.string().nullish(),
        slug: zod_1.z.string().nullish(),
        publishedAt: zod_1.z.string().nullish(),
        createdAt: zod_1.z.string().nullish(),
        updatedAt: zod_1.z.string().nullish(),
    })
        .loose();
})(Category || (exports.Category = Category = {}));
var FeeSchedule;
(function (FeeSchedule) {
    FeeSchedule.Schema = zod_1.z
        .object({
        exponent: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).nullish(),
        rate: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).nullish(),
        takerOnly: zod_1.z.boolean().nullish(),
        rebateRate: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).nullish(),
    })
        .loose();
})(FeeSchedule || (exports.FeeSchedule = FeeSchedule = {}));
var Market;
(function (Market) {
    Market.Id = zod_1.z.coerce.string().trim().brand("PolymarketGammaMarketId");
    Market.ConditionId = zod_1.z.string().trim().brand("PolymarketConditionId");
    Market.QuestionId = zod_1.z.string().brand("PolymarketQuestionId");
    Market.TokenId = zod_1.z.string().brand("PolymarketClobTokenId");
    // Gamma returns outcomes, prices and token ids as JSON-encoded strings rather than arrays.
    // Decoding here means every consumer sees an array; a value that isn't valid JSON is passed
    // through untouched rather than throwing, since Gamma evolves independently.
    Market.SerializedStringArray = zod_1.z
        .union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())])
        .transform(value => {
        if (typeof value !== "string")
            return value;
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : value;
        }
        catch {
            return value;
        }
    });
    /**
     * The same decode, then to numbers — for `outcomePrices`, which arrives as `"[\"0.19\",…]"`.
     *
     * Only prices. `clobTokenIds` are 77-digit integers, far past Number.MAX_SAFE_INTEGER, so
     * coercing them would silently corrupt every token id; `outcomes` are genuinely text.
     */
    Market.SerializedNumberArray = Market.SerializedStringArray.transform(value => Array.isArray(value)
        ? value.map(entry => {
            const parsed = Number(entry);
            return Number.isFinite(parsed) ? parsed : null;
        })
        : value);
    // Gamma sends one flat object. These groups exist to make ~100 keys readable and to say what
    // each block is for; `Schema` merges them straight back, so the mirror still matches the wire
    // exactly. Nesting them would make the schema describe a payload Gamma never sends.
    /** What the market asks, and the four ids the rest of Polymarket addresses it by. */
    const Identity = zod_1.z.object({
        id: Market.Id,
        question: zod_1.z.string().nullish(),
        conditionId: Market.ConditionId.nullish(),
        questionID: Market.QuestionId.nullish(),
        slug: zod_1.z.string().nullish(),
        description: zod_1.z.string().nullish(),
        resolutionSource: zod_1.z.string().nullish(),
    });
    const Timing = zod_1.z.object({
        startDate: zod_1.z.string().nullish(),
        endDate: zod_1.z.string().nullish(),
        startDateIso: zod_1.z.string().nullish(),
        endDateIso: zod_1.z.string().nullish(),
        closedTime: zod_1.z.string().nullish(),
        gameStartTime: zod_1.z.string().nullish(),
        eventStartTime: zod_1.z.string().nullish(),
    });
    /** Artwork for the website. `image` and `icon` are usually the same file. */
    const Media = zod_1.z.object({
        image: zod_1.z.string().nullish(),
        icon: zod_1.z.string().nullish(),
        twitterCardImage: zod_1.z.string().nullish(),
        imageOptimized: Image.Schema.nullish(),
        iconOptimized: Image.Schema.nullish(),
    });
    /** The tradeable substance: two outcomes, their tokens, and their last known prices. */
    const Outcomes = zod_1.z.object({
        outcomes: Market.SerializedStringArray.nullish(),
        outcomePrices: Market.SerializedNumberArray.nullish(),
        clobTokenIds: Market.SerializedStringArray.nullish(),
        shortOutcomes: Market.SerializedStringArray.nullish(),
    });
    /** `active` and `closed` are the two anyone outside Polymarket needs; the rest are deployment. */
    const Lifecycle = zod_1.z.object({
        active: zod_1.z.boolean().nullish(),
        closed: zod_1.z.boolean().nullish(),
        archived: zod_1.z.boolean().nullish(),
        new: zod_1.z.boolean().nullish(),
        featured: zod_1.z.boolean().nullish(),
        restricted: zod_1.z.boolean().nullish(),
        approved: zod_1.z.boolean().nullish(),
        ready: zod_1.z.boolean().nullish(),
        funded: zod_1.z.boolean().nullish(),
        enableOrderBook: zod_1.z.boolean().nullish(),
        acceptingOrders: zod_1.z.boolean().nullish(),
        acceptingOrdersTimestamp: zod_1.z.string().nullish(),
        automaticallyActive: zod_1.z.boolean().nullish(),
        clearBookOnStart: zod_1.z.boolean().nullish(),
        manualActivation: zod_1.z.boolean().nullish(),
        pendingDeployment: zod_1.z.boolean().nullish(),
        deploying: zod_1.z.boolean().nullish(),
        deployingTimestamp: zod_1.z.string().nullish(),
        scheduledDeploymentTimestamp: zod_1.z.string().nullish(),
        requiresTranslation: zod_1.z.boolean().nullish(),
    });
    /** Same figures sliced by window and by venue (Amm vs Clob). `volume` and `volumeClob` are
     *  routinely identical — Gamma reports totals many ways rather than one. */
    const Metrics = zod_1.z.object({
        volume: Common.LooseNumber.nullish(),
        volumeNum: zod_1.z.number().nullish(),
        volume24hr: zod_1.z.number().nullish(),
        volume1wk: zod_1.z.number().nullish(),
        volume1mo: zod_1.z.number().nullish(),
        volume1yr: zod_1.z.number().nullish(),
        volumeAmm: zod_1.z.number().nullish(),
        volumeClob: zod_1.z.number().nullish(),
        volume24hrAmm: zod_1.z.number().nullish(),
        volume1wkAmm: zod_1.z.number().nullish(),
        volume1moAmm: zod_1.z.number().nullish(),
        volume1yrAmm: zod_1.z.number().nullish(),
        volume24hrClob: zod_1.z.number().nullish(),
        volume1wkClob: zod_1.z.number().nullish(),
        volume1moClob: zod_1.z.number().nullish(),
        volume1yrClob: zod_1.z.number().nullish(),
        liquidity: Common.LooseNumber.nullish(),
        liquidityNum: zod_1.z.number().nullish(),
        liquidityAmm: zod_1.z.number().nullish(),
        liquidityClob: zod_1.z.number().nullish(),
    });
    /** A snapshot of the book. The live version is the CLOB's, not Gamma's. */
    const Book = zod_1.z.object({
        bestBid: zod_1.z.number().nullish(),
        bestAsk: zod_1.z.number().nullish(),
        spread: zod_1.z.number().nullish(),
        lastTradePrice: zod_1.z.number().nullish(),
        oneHourPriceChange: zod_1.z.number().nullish(),
        oneDayPriceChange: zod_1.z.number().nullish(),
        oneWeekPriceChange: zod_1.z.number().nullish(),
        oneMonthPriceChange: zod_1.z.number().nullish(),
        oneYearPriceChange: zod_1.z.number().nullish(),
    });
    /** How the website files and renders this market, including the sports-specific fields. */
    const Classification = zod_1.z.object({
        marketType: zod_1.z.string().nullish(),
        formatType: zod_1.z.string().nullish(),
        category: zod_1.z.string().nullish(),
        groupItemTitle: zod_1.z.string().nullish(),
        groupItemThreshold: zod_1.z.string().nullish(),
        groupItemRange: zod_1.z.string().nullish(),
        sportsMarketType: zod_1.z.string().nullish(),
        gameId: Common.LooseString.nullish(),
        line: zod_1.z.number().nullish(),
        seriesColor: zod_1.z.string().nullish(),
    });
    /** Trading constraints and economics. `Markets.GetClobInfo` returns the authoritative version. */
    const Fees = zod_1.z.object({
        marketMakerAddress: zod_1.z.string().nullish(),
        makerBaseFee: zod_1.z.number().nullish(),
        takerBaseFee: zod_1.z.number().nullish(),
        fee: zod_1.z.string().nullish(),
        feeType: zod_1.z.string().nullish(),
        feeSchedule: FeeSchedule.Schema.nullish(),
        feesEnabled: zod_1.z.boolean().nullish(),
        orderPriceMinTickSize: zod_1.z.number().nullish(),
        orderMinSize: zod_1.z.number().nullish(),
        rewardsMinSize: zod_1.z.number().nullish(),
        rewardsMaxSpread: zod_1.z.number().nullish(),
        rfqEnabled: zod_1.z.boolean().nullish(),
        holdingRewardsEnabled: zod_1.z.boolean().nullish(),
    });
    /** Negative-risk grouping: how "only one of these 128 can win" is enforced on-chain. */
    const NegRisk = zod_1.z.object({
        negRisk: zod_1.z.boolean().nullish(),
        negRiskOther: zod_1.z.boolean().nullish(),
        negRiskMarketID: zod_1.z.string().nullish(),
        negRiskRequestID: zod_1.z.string().nullish(),
        negRiskFeeBips: zod_1.z.number().nullish(),
    });
    /** UMA optimistic-oracle plumbing — who settles this market, and under what bond. */
    const Resolution = zod_1.z.object({
        umaResolutionStatus: zod_1.z.string().nullish(),
        umaResolutionStatuses: zod_1.z.string().nullish(),
        umaEndDate: zod_1.z.string().nullish(),
        umaEndDateIso: zod_1.z.string().nullish(),
        umaBond: zod_1.z.string().nullish(),
        umaReward: zod_1.z.string().nullish(),
        resolvedBy: zod_1.z.string().nullish(),
        customLiveness: zod_1.z.number().nullish(),
    });
    const Authorship = zod_1.z.object({
        createdBy: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).nullish(),
        updatedBy: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).nullish(),
        createdAt: zod_1.z.string().nullish(),
        updatedAt: zod_1.z.string().nullish(),
        submitted_by: zod_1.z.string().nullish(),
        creator: zod_1.z.string().nullish(),
        commentCount: zod_1.z.number().nullish(),
        cyom: zod_1.z.boolean().nullish(),
        competitive: Common.LooseNumber.nullish(),
    });
    /** `events` is the parent, echoed back in full — the single heaviest key on a market, and the
     *  reason a raw market is ~7 KB. Kept non-recursive: the event -> markets direction is the
     *  useful traversal, and Event responses type it properly. */
    const Relations = zod_1.z.object({
        events: zod_1.z.array(zod_1.z.unknown()).nullish(),
        tags: zod_1.z.array(Tag.Schema).nullish(),
        categories: zod_1.z.array(Category.Schema).nullish(),
    });
    Market.Schema = zod_1.z
        .object({
        ...Identity.shape,
        ...Timing.shape,
        ...Media.shape,
        ...Outcomes.shape,
        ...Lifecycle.shape,
        ...Metrics.shape,
        ...Book.shape,
        ...Classification.shape,
        ...Fees.shape,
        ...NegRisk.shape,
        ...Resolution.shape,
        ...Authorship.shape,
        ...Relations.shape,
    })
        .loose();
})(Market || (exports.Market = Market = {}));
var Series;
(function (Series) {
    Series.Id = zod_1.z.coerce.string().trim().brand("PolymarketGammaSeriesId");
    Series.Schema = zod_1.z
        .object({
        id: Series.Id,
        ticker: zod_1.z.string().nullish(),
        slug: zod_1.z.string().nullish(),
        title: zod_1.z.string().nullish(),
        subtitle: zod_1.z.string().nullish(),
        seriesType: zod_1.z.string().nullish(),
        recurrence: zod_1.z.string().nullish(),
        description: zod_1.z.string().nullish(),
        image: zod_1.z.string().nullish(),
        icon: zod_1.z.string().nullish(),
        layout: zod_1.z.string().nullish(),
        active: zod_1.z.boolean().nullish(),
        closed: zod_1.z.boolean().nullish(),
        archived: zod_1.z.boolean().nullish(),
        new: zod_1.z.boolean().nullish(),
        featured: zod_1.z.boolean().nullish(),
        restricted: zod_1.z.boolean().nullish(),
        isTemplate: zod_1.z.boolean().nullish(),
        templateVariables: zod_1.z.union([zod_1.z.boolean(), zod_1.z.string()]).nullish(),
        publishedAt: zod_1.z.string().nullish(),
        createdBy: zod_1.z.string().nullish(),
        updatedBy: zod_1.z.string().nullish(),
        createdAt: zod_1.z.string().nullish(),
        updatedAt: zod_1.z.string().nullish(),
        commentsEnabled: zod_1.z.boolean().nullish(),
        competitive: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).nullish(),
        volume24hr: zod_1.z.number().nullish(),
        volume: zod_1.z.number().nullish(),
        liquidity: zod_1.z.number().nullish(),
        startDate: zod_1.z.string().nullish(),
        pythTokenID: zod_1.z.string().nullish(),
        cgAssetName: zod_1.z.string().nullish(),
        score: Common.LooseString.nullish(),
        commentCount: zod_1.z.number().nullish(),
        requiresTranslation: zod_1.z.boolean().nullish(),
        events: zod_1.z.array(zod_1.z.unknown()).nullish(),
        collections: zod_1.z.array(zod_1.z.unknown()).nullish(),
        categories: zod_1.z.array(Category.Schema).nullish(),
        tags: zod_1.z.array(Tag.Schema).nullish(),
        chats: zod_1.z.array(zod_1.z.unknown()).nullish(),
    })
        .loose();
})(Series || (exports.Series = Series = {}));
var Event;
(function (Event) {
    Event.Id = zod_1.z.coerce.string().trim().brand("PolymarketGammaEventId");
    Event.Schema = zod_1.z
        .object({
        id: Event.Id,
        ticker: zod_1.z.string().nullish(),
        slug: zod_1.z.string().nullish(),
        title: zod_1.z.string().nullish(),
        subtitle: zod_1.z.string().nullish(),
        description: zod_1.z.string().nullish(),
        resolutionSource: zod_1.z.string().nullish(),
        startDate: zod_1.z.string().nullish(),
        creationDate: zod_1.z.string().nullish(),
        endDate: zod_1.z.string().nullish(),
        closedTime: zod_1.z.string().nullish(),
        startTime: zod_1.z.string().nullish(),
        eventDate: zod_1.z.string().nullish(),
        eventWeek: zod_1.z.number().nullish(),
        finishedTimestamp: zod_1.z.string().nullish(),
        image: zod_1.z.string().nullish(),
        icon: zod_1.z.string().nullish(),
        featuredImage: zod_1.z.string().nullish(),
        imageOptimized: Image.Schema.nullish(),
        iconOptimized: Image.Schema.nullish(),
        featuredImageOptimized: Image.Schema.nullish(),
        active: zod_1.z.boolean().nullish(),
        closed: zod_1.z.boolean().nullish(),
        archived: zod_1.z.boolean().nullish(),
        new: zod_1.z.boolean().nullish(),
        featured: zod_1.z.boolean().nullish(),
        restricted: zod_1.z.boolean().nullish(),
        live: zod_1.z.boolean().nullish(),
        ended: zod_1.z.boolean().nullish(),
        pendingDeployment: zod_1.z.boolean().nullish(),
        deploying: zod_1.z.boolean().nullish(),
        automaticallyResolved: zod_1.z.boolean().nullish(),
        automaticallyActive: zod_1.z.boolean().nullish(),
        requiresTranslation: zod_1.z.boolean().nullish(),
        liquidity: zod_1.z.number().nullish(),
        liquidityAmm: zod_1.z.number().nullish(),
        liquidityClob: zod_1.z.number().nullish(),
        volume: zod_1.z.number().nullish(),
        openInterest: zod_1.z.number().nullish(),
        volume24hr: zod_1.z.number().nullish(),
        volume1wk: zod_1.z.number().nullish(),
        volume1mo: zod_1.z.number().nullish(),
        volume1yr: zod_1.z.number().nullish(),
        category: zod_1.z.string().nullish(),
        subcategory: zod_1.z.string().nullish(),
        seriesSlug: zod_1.z.string().nullish(),
        recurrence: zod_1.z.string().nullish(),
        sortBy: zod_1.z.string().nullish(),
        competitive: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).nullish(),
        score: Common.LooseString.nullish(),
        elapsed: Common.LooseString.nullish(),
        period: Common.LooseString.nullish(),
        gameStatus: zod_1.z.string().nullish(),
        gameId: Common.LooseString.nullish(),
        enableOrderBook: zod_1.z.boolean().nullish(),
        enableNegRisk: zod_1.z.boolean().nullish(),
        negRisk: zod_1.z.boolean().nullish(),
        negRiskMarketID: zod_1.z.string().nullish(),
        negRiskFeeBips: zod_1.z.number().nullish(),
        negRiskAugmented: zod_1.z.boolean().nullish(),
        cyom: zod_1.z.boolean().nullish(),
        showAllOutcomes: zod_1.z.boolean().nullish(),
        showMarketImages: zod_1.z.boolean().nullish(),
        commentsEnabled: zod_1.z.boolean().nullish(),
        commentCount: zod_1.z.number().nullish(),
        createdBy: zod_1.z.string().nullish(),
        updatedBy: zod_1.z.string().nullish(),
        createdAt: zod_1.z.string().nullish(),
        updatedAt: zod_1.z.string().nullish(),
        published_at: zod_1.z.string().nullish(),
        publishedAt: zod_1.z.string().nullish(),
        markets: zod_1.z.array(Market.Schema).nullish(),
        series: zod_1.z.array(Series.Schema).nullish(),
        tags: zod_1.z.array(Tag.Schema).nullish(),
        subEvents: zod_1.z.array(zod_1.z.unknown()).nullish(),
        eventCreators: zod_1.z.array(zod_1.z.unknown()).nullish(),
        eventMetadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).nullish(),
    })
        .loose();
})(Event || (exports.Event = Event = {}));
var Profile;
(function (Profile) {
    Profile.Schema = zod_1.z
        .object({
        id: zod_1.z.string().nullish(),
        createdAt: zod_1.z.string().nullish(),
        proxyWallet: zod_1.z.string().nullish(),
        baseAddress: zod_1.z.string().nullish(),
        profileImage: zod_1.z.string().nullish(),
        profileImageOptimized: Image.Schema.nullish(),
        displayUsernamePublic: zod_1.z.boolean().nullish(),
        bio: zod_1.z.string().nullish(),
        pseudonym: zod_1.z.string().nullish(),
        name: zod_1.z.string().nullish(),
        xUsername: zod_1.z.string().nullish(),
        verifiedBadge: zod_1.z.boolean().nullish(),
        isMod: zod_1.z.boolean().nullish(),
        isCreator: zod_1.z.boolean().nullish(),
        users: zod_1.z
            .array(zod_1.z
            .object({
            id: zod_1.z.string().nullish(),
            creator: zod_1.z.boolean().nullish(),
            mod: zod_1.z.boolean().nullish(),
        })
            .loose())
            .nullish(),
        positions: zod_1.z
            .array(zod_1.z
            .object({
            tokenId: zod_1.z.string().nullish(),
            positionSize: zod_1.z.string().nullish(),
        })
            .loose())
            .nullish(),
    })
        .loose();
})(Profile || (exports.Profile = Profile = {}));
var Reaction;
(function (Reaction) {
    Reaction.Schema = zod_1.z
        .object({
        id: zod_1.z.string().nullish(),
        commentID: zod_1.z.number().nullish(),
        reactionType: zod_1.z.string().nullish(),
        icon: zod_1.z.string().nullish(),
        userAddress: zod_1.z.string().nullish(),
        createdAt: zod_1.z.string().nullish(),
        profile: Profile.Schema.nullish(),
    })
        .loose();
})(Reaction || (exports.Reaction = Reaction = {}));
var Comment;
(function (Comment) {
    Comment.Id = zod_1.z.coerce.string().trim().brand("PolymarketGammaCommentId");
    Comment.ParentEntityType = zod_1.z.enum(["Event", "Series", "market"]);
    Comment.Schema = zod_1.z
        .object({
        id: Comment.Id,
        body: zod_1.z.string().nullish(),
        parentEntityType: zod_1.z.string().nullish(),
        parentEntityID: zod_1.z.number().nullish(),
        parentCommentID: zod_1.z.string().nullish(),
        userAddress: zod_1.z.string().nullish(),
        replyAddress: zod_1.z.string().nullish(),
        createdAt: zod_1.z.string().nullish(),
        updatedAt: zod_1.z.string().nullish(),
        profile: Profile.Schema.nullish(),
        reactions: zod_1.z.array(Reaction.Schema).nullish(),
        reportCount: zod_1.z.number().nullish(),
        reactionCount: zod_1.z.number().nullish(),
    })
        .loose();
})(Comment || (exports.Comment = Comment = {}));
var Team;
(function (Team) {
    Team.Schema = zod_1.z
        .object({
        id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
        name: zod_1.z.string().nullish(),
        league: zod_1.z.string().nullish(),
        record: zod_1.z.string().nullish(),
        logo: zod_1.z.string().nullish(),
        abbreviation: zod_1.z.string().nullish(),
        alias: zod_1.z.string().nullish(),
        providerId: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).nullish(),
        color: zod_1.z.string().nullish(),
        createdAt: zod_1.z.string().nullish(),
        updatedAt: zod_1.z.string().nullish(),
    })
        .loose();
})(Team || (exports.Team = Team = {}));
var Sport;
(function (Sport) {
    Sport.Schema = zod_1.z
        .object({
        id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).nullish(),
        sport: zod_1.z.string(),
        image: zod_1.z.string().nullish(),
        resolution: zod_1.z.string().nullish(),
        ordering: zod_1.z.string().nullish(),
        tags: zod_1.z.string().nullish(),
        series: zod_1.z.string().nullish(),
        createdAt: zod_1.z.string().nullish(),
    })
        .loose();
})(Sport || (exports.Sport = Sport = {}));
var Search;
(function (Search) {
    Search.TagResult = Tag.Schema.extend({
        event_count: zod_1.z.number().nullish(),
    }).loose();
    Search.Pagination = zod_1.z
        .object({
        hasMore: zod_1.z.boolean(),
        totalResults: zod_1.z.number(),
    })
        .loose();
    Search.Response = zod_1.z
        .object({
        events: zod_1.z.array(Event.Schema).nullish(),
        tags: zod_1.z.array(Search.TagResult).nullish(),
        profiles: zod_1.z.array(Profile.Schema).nullish(),
        pagination: Search.Pagination,
    })
        .loose();
})(Search || (exports.Search = Search = {}));
