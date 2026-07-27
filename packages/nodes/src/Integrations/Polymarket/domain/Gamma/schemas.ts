import { z } from "zod"

export namespace Common {
    export const DateTime = z.string()
    export type DateTime = z.infer<typeof DateTime>

    export const WalletAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/)
    export type WalletAddress = z.infer<typeof WalletAddress>

    export const LegacyPagination = z.object({
        // Gamma caps these list endpoints at 500, and a limit of 0 returns nothing — bounding
        // here means callers hand over a raw field value instead of pre-clamping it.
        limit:     z.number().int().min(1).max(500).optional(),
        offset:    z.number().int().min(0).optional(),
        order:     z.string().optional(),
        ascending: z.boolean().optional(),
    })

    export const KeysetPagination = z.object({
        limit:        z.number().int().min(1).optional(),
        order:        z.string().optional(),
        ascending:    z.boolean().optional(),
        after_cursor: z.string().optional(),
    })

    export const DateRange = z.object({
        start_date_min: DateTime.optional(),
        start_date_max: DateTime.optional(),
        end_date_min:   DateTime.optional(),
        end_date_max:   DateTime.optional(),
    })
}

/**
 * Gamma evolves independently of PretzelGraph. Entity schemas intentionally pass
 * through unknown keys while strongly describing the stable, useful surface.
 */

export namespace Image {
    export const Schema = z
        .object({
            id:                        z.string().nullish(),
            imageUrlSource:            z.string().nullish(),
            imageUrlOptimized:         z.string().nullish(),
            imageSizeKbSource:         z.number().nullish(),
            imageSizeKbOptimized:      z.number().nullish(),
            imageOptimizedComplete:    z.boolean().nullish(),
            imageOptimizedLastUpdated: z.string().nullish(),
            relID:                     z.number().nullish(),
            field:                     z.string().nullish(),
            relname:                   z.string().nullish(),
        })
        .loose()
}
export type Image = z.infer<typeof Image.Schema>

export namespace Tag {
    export const Id = z.coerce.string().trim().brand("PolymarketGammaTagId")
    export type Id = z.infer<typeof Id>

    export const Schema = z
        .object({
            id:                  Id,
            label:               z.string().nullish(),
            slug:                z.string().nullish(),
            forceShow:           z.boolean().nullish(),
            forceHide:           z.boolean().nullish(),
            isCarousel:          z.boolean().nullish(),
            publishedAt:         z.string().nullish(),
            createdBy:           z.union([z.string(), z.number()]).nullish(),
            updatedBy:           z.union([z.string(), z.number()]).nullish(),
            createdAt:           z.string().nullish(),
            updatedAt:           z.string().nullish(),
            requiresTranslation: z.boolean().nullish(),
            event_count:         z.number().nullish(),
        })
        .loose()
}
export type Tag = z.infer<typeof Tag.Schema>

export namespace TagRelationship {
    export const Schema = z
        .object({
            id:           z.string().nullish(),
            tagID:        z.number().nullish(),
            relatedTagID: z.number().nullish(),
            rank:         z.number().nullish(),
        })
        .loose()
}
export type TagRelationship = z.infer<typeof TagRelationship.Schema>

export namespace Category {
    export const Schema = z
        .object({
            id:             z.string().nullish(),
            label:          z.string().nullish(),
            parentCategory: z.string().nullish(),
            slug:           z.string().nullish(),
            publishedAt:    z.string().nullish(),
            createdAt:      z.string().nullish(),
            updatedAt:      z.string().nullish(),
        })
        .loose()
}
export type Category = z.infer<typeof Category.Schema>

export namespace FeeSchedule {
    export const Schema = z
        .object({
            exponent:   z.union([z.number(), z.string()]).nullish(),
            rate:       z.union([z.number(), z.string()]).nullish(),
            takerOnly:  z.boolean().nullish(),
            rebateRate: z.union([z.number(), z.string()]).nullish(),
        })
        .loose()
}
export type FeeSchedule = z.infer<typeof FeeSchedule.Schema>

export namespace Market {
    export const Id = z.coerce.string().trim().brand("PolymarketGammaMarketId")
    export type Id = z.infer<typeof Id>

    export const ConditionId = z.string().trim().brand("PolymarketConditionId")
    export type ConditionId = z.infer<typeof ConditionId>

    export const QuestionId = z.string().brand("PolymarketQuestionId")
    export type QuestionId = z.infer<typeof QuestionId>

    export const TokenId = z.string().brand("PolymarketClobTokenId")
    export type TokenId = z.infer<typeof TokenId>

    // Gamma returns outcomes, prices and token ids as JSON-encoded strings rather than arrays.
    // Decoding here means every consumer sees an array; a value that isn't valid JSON is passed
    // through untouched rather than throwing, since Gamma evolves independently.
    export const SerializedStringArray = z
        .union([z.string(), z.array(z.string())])
        .transform(value => {
            if (typeof value !== "string")
                return value

            try {
                const parsed: unknown = JSON.parse(value)

                return Array.isArray(parsed) ? parsed as string[] : value
            }
            catch {
                return value
            }
        })

    export const Schema = z
        .object({
            id:               Id,
            question:         z.string().nullish(),
            conditionId:      ConditionId.nullish(),
            questionID:       QuestionId.nullish(),
            slug:             z.string().nullish(),
            description:      z.string().nullish(),
            resolutionSource: z.string().nullish(),

            startDate:      z.string().nullish(),
            endDate:        z.string().nullish(),
            startDateIso:   z.string().nullish(),
            endDateIso:     z.string().nullish(),
            closedTime:     z.string().nullish(),
            gameStartTime:  z.string().nullish(),
            eventStartTime: z.string().nullish(),

            image:            z.string().nullish(),
            icon:             z.string().nullish(),
            twitterCardImage: z.string().nullish(),
            imageOptimized:   Image.Schema.nullish(),
            iconOptimized:    Image.Schema.nullish(),

            outcomes:      SerializedStringArray.nullish(),
            outcomePrices: SerializedStringArray.nullish(),
            clobTokenIds:  SerializedStringArray.nullish(),
            shortOutcomes: SerializedStringArray.nullish(),

            active:                       z.boolean().nullish(),
            closed:                       z.boolean().nullish(),
            archived:                     z.boolean().nullish(),
            new:                          z.boolean().nullish(),
            featured:                     z.boolean().nullish(),
            restricted:                   z.boolean().nullish(),
            approved:                     z.boolean().nullish(),
            ready:                        z.boolean().nullish(),
            funded:                       z.boolean().nullish(),
            enableOrderBook:              z.boolean().nullish(),
            acceptingOrders:              z.boolean().nullish(),
            acceptingOrdersTimestamp:     z.string().nullish(),
            automaticallyActive:          z.boolean().nullish(),
            clearBookOnStart:             z.boolean().nullish(),
            manualActivation:             z.boolean().nullish(),
            pendingDeployment:            z.boolean().nullish(),
            deploying:                    z.boolean().nullish(),
            deployingTimestamp:           z.string().nullish(),
            scheduledDeploymentTimestamp: z.string().nullish(),
            requiresTranslation:          z.boolean().nullish(),

            volume:         z.union([z.number(), z.string()]).nullish(),
            volumeNum:      z.number().nullish(),
            volume24hr:     z.number().nullish(),
            volume1wk:      z.number().nullish(),
            volume1mo:      z.number().nullish(),
            volume1yr:      z.number().nullish(),
            volumeAmm:      z.number().nullish(),
            volumeClob:     z.number().nullish(),
            volume24hrAmm:  z.number().nullish(),
            volume1wkAmm:   z.number().nullish(),
            volume1moAmm:   z.number().nullish(),
            volume1yrAmm:   z.number().nullish(),
            volume24hrClob: z.number().nullish(),
            volume1wkClob:  z.number().nullish(),
            volume1moClob:  z.number().nullish(),
            volume1yrClob:  z.number().nullish(),

            liquidity:     z.union([z.number(), z.string()]).nullish(),
            liquidityNum:  z.number().nullish(),
            liquidityAmm:  z.number().nullish(),
            liquidityClob: z.number().nullish(),

            bestBid:             z.number().nullish(),
            bestAsk:             z.number().nullish(),
            spread:              z.number().nullish(),
            lastTradePrice:      z.number().nullish(),
            oneHourPriceChange:  z.number().nullish(),
            oneDayPriceChange:   z.number().nullish(),
            oneWeekPriceChange:  z.number().nullish(),
            oneMonthPriceChange: z.number().nullish(),
            oneYearPriceChange:  z.number().nullish(),

            marketType:         z.string().nullish(),
            formatType:         z.string().nullish(),
            category:           z.string().nullish(),
            groupItemTitle:     z.string().nullish(),
            groupItemThreshold: z.string().nullish(),
            groupItemRange:     z.string().nullish(),
            sportsMarketType:   z.string().nullish(),
            gameId:             z.string().nullish(),
            line:               z.number().nullish(),
            seriesColor:        z.string().nullish(),

            marketMakerAddress:    z.string().nullish(),
            makerBaseFee:          z.number().nullish(),
            takerBaseFee:          z.number().nullish(),
            fee:                   z.string().nullish(),
            feeType:               z.string().nullish(),
            feeSchedule:           FeeSchedule.Schema.nullish(),
            feesEnabled:           z.boolean().nullish(),
            orderPriceMinTickSize: z.number().nullish(),
            orderMinSize:          z.number().nullish(),
            rewardsMinSize:        z.number().nullish(),
            rewardsMaxSpread:      z.number().nullish(),
            rfqEnabled:            z.boolean().nullish(),
            holdingRewardsEnabled: z.boolean().nullish(),

            negRisk:               z.boolean().nullish(),
            negRiskOther:          z.boolean().nullish(),
            negRiskMarketID:       z.string().nullish(),
            negRiskRequestID:      z.string().nullish(),
            negRiskFeeBips:        z.number().nullish(),
            umaResolutionStatus:   z.string().nullish(),
            umaResolutionStatuses: z.string().nullish(),
            umaEndDate:            z.string().nullish(),
            umaEndDateIso:         z.string().nullish(),
            umaBond:               z.string().nullish(),
            umaReward:             z.string().nullish(),
            resolvedBy:            z.string().nullish(),
            customLiveness:        z.number().nullish(),

            createdBy:    z.union([z.string(), z.number()]).nullish(),
            updatedBy:    z.union([z.string(), z.number()]).nullish(),
            createdAt:    z.string().nullish(),
            updatedAt:    z.string().nullish(),
            submitted_by: z.string().nullish(),
            creator:      z.string().nullish(),
            commentCount: z.number().nullish(),
            cyom:         z.boolean().nullish(),
            competitive:  z.union([z.number(), z.string()]).nullish(),

            // Kept non-recursive here. Event responses provide the strongly typed
            // event -> markets direction, which is the useful discovery traversal.
            events:     z.array(z.unknown()).nullish(),
            tags:       z.array(Tag.Schema).nullish(),
            categories: z.array(Category.Schema).nullish(),
        })
        .loose()
}
export type Market = z.infer<typeof Market.Schema>

export namespace Series {
    export const Id = z.coerce.string().trim().brand("PolymarketGammaSeriesId")
    export type Id = z.infer<typeof Id>

    export const Schema = z
        .object({
            id:                  Id,
            ticker:              z.string().nullish(),
            slug:                z.string().nullish(),
            title:               z.string().nullish(),
            subtitle:            z.string().nullish(),
            seriesType:          z.string().nullish(),
            recurrence:          z.string().nullish(),
            description:         z.string().nullish(),
            image:               z.string().nullish(),
            icon:                z.string().nullish(),
            layout:              z.string().nullish(),
            active:              z.boolean().nullish(),
            closed:              z.boolean().nullish(),
            archived:            z.boolean().nullish(),
            new:                 z.boolean().nullish(),
            featured:            z.boolean().nullish(),
            restricted:          z.boolean().nullish(),
            isTemplate:          z.boolean().nullish(),
            templateVariables:   z.union([z.boolean(), z.string()]).nullish(),
            publishedAt:         z.string().nullish(),
            createdBy:           z.string().nullish(),
            updatedBy:           z.string().nullish(),
            createdAt:           z.string().nullish(),
            updatedAt:           z.string().nullish(),
            commentsEnabled:     z.boolean().nullish(),
            competitive:         z.union([z.number(), z.string()]).nullish(),
            volume24hr:          z.number().nullish(),
            volume:              z.number().nullish(),
            liquidity:           z.number().nullish(),
            startDate:           z.string().nullish(),
            pythTokenID:         z.string().nullish(),
            cgAssetName:         z.string().nullish(),
            score:               z.number().nullish(),
            commentCount:        z.number().nullish(),
            requiresTranslation: z.boolean().nullish(),
            events:              z.array(z.unknown()).nullish(),
            collections:         z.array(z.unknown()).nullish(),
            categories:          z.array(Category.Schema).nullish(),
            tags:                z.array(Tag.Schema).nullish(),
            chats:               z.array(z.unknown()).nullish(),
        })
        .loose()
}
export type Series = z.infer<typeof Series.Schema>

export namespace Event {
    export const Id = z.coerce.string().trim().brand("PolymarketGammaEventId")
    export type Id = z.infer<typeof Id>

    export const Schema = z
        .object({
            id:               Id,
            ticker:           z.string().nullish(),
            slug:             z.string().nullish(),
            title:            z.string().nullish(),
            subtitle:         z.string().nullish(),
            description:      z.string().nullish(),
            resolutionSource: z.string().nullish(),

            startDate:         z.string().nullish(),
            creationDate:      z.string().nullish(),
            endDate:           z.string().nullish(),
            closedTime:        z.string().nullish(),
            startTime:         z.string().nullish(),
            eventDate:         z.string().nullish(),
            eventWeek:         z.number().nullish(),
            finishedTimestamp: z.string().nullish(),

            image:                  z.string().nullish(),
            icon:                   z.string().nullish(),
            featuredImage:          z.string().nullish(),
            imageOptimized:         Image.Schema.nullish(),
            iconOptimized:          Image.Schema.nullish(),
            featuredImageOptimized: Image.Schema.nullish(),

            active:                z.boolean().nullish(),
            closed:                z.boolean().nullish(),
            archived:              z.boolean().nullish(),
            new:                   z.boolean().nullish(),
            featured:              z.boolean().nullish(),
            restricted:            z.boolean().nullish(),
            live:                  z.boolean().nullish(),
            ended:                 z.boolean().nullish(),
            pendingDeployment:     z.boolean().nullish(),
            deploying:             z.boolean().nullish(),
            automaticallyResolved: z.boolean().nullish(),
            automaticallyActive:   z.boolean().nullish(),
            requiresTranslation:   z.boolean().nullish(),

            liquidity:     z.number().nullish(),
            liquidityAmm:  z.number().nullish(),
            liquidityClob: z.number().nullish(),
            volume:        z.number().nullish(),
            openInterest:  z.number().nullish(),
            volume24hr:    z.number().nullish(),
            volume1wk:     z.number().nullish(),
            volume1mo:     z.number().nullish(),
            volume1yr:     z.number().nullish(),

            category:    z.string().nullish(),
            subcategory: z.string().nullish(),
            seriesSlug:  z.string().nullish(),
            recurrence:  z.string().nullish(),
            sortBy:      z.string().nullish(),
            competitive: z.union([z.number(), z.string()]).nullish(),
            score:       z.string().nullish(),
            elapsed:     z.string().nullish(),
            period:      z.string().nullish(),
            gameStatus:  z.string().nullish(),
            gameId:      z.string().nullish(),

            enableOrderBook:  z.boolean().nullish(),
            enableNegRisk:    z.boolean().nullish(),
            negRisk:          z.boolean().nullish(),
            negRiskMarketID:  z.string().nullish(),
            negRiskFeeBips:   z.number().nullish(),
            negRiskAugmented: z.boolean().nullish(),
            cyom:             z.boolean().nullish(),

            showAllOutcomes:  z.boolean().nullish(),
            showMarketImages: z.boolean().nullish(),
            commentsEnabled:  z.boolean().nullish(),
            commentCount:     z.number().nullish(),

            createdBy:    z.string().nullish(),
            updatedBy:    z.string().nullish(),
            createdAt:    z.string().nullish(),
            updatedAt:    z.string().nullish(),
            published_at: z.string().nullish(),
            publishedAt:  z.string().nullish(),

            markets:       z.array(Market.Schema).nullish(),
            series:        z.array(Series.Schema).nullish(),
            tags:          z.array(Tag.Schema).nullish(),
            subEvents:     z.array(z.unknown()).nullish(),
            eventCreators: z.array(z.unknown()).nullish(),
            eventMetadata: z.record(z.string(), z.unknown()).nullish(),
        })
        .loose()
}
export type Event = z.infer<typeof Event.Schema>

export namespace Profile {
    export const Schema = z
        .object({
            id:                    z.string().nullish(),
            createdAt:             z.string().nullish(),
            proxyWallet:           z.string().nullish(),
            baseAddress:           z.string().nullish(),
            profileImage:          z.string().nullish(),
            profileImageOptimized: Image.Schema.nullish(),
            displayUsernamePublic: z.boolean().nullish(),
            bio:                   z.string().nullish(),
            pseudonym:             z.string().nullish(),
            name:                  z.string().nullish(),
            xUsername:             z.string().nullish(),
            verifiedBadge:         z.boolean().nullish(),
            isMod:                 z.boolean().nullish(),
            isCreator:             z.boolean().nullish(),
            users:                 z
                .array(
                    z
                        .object({
                            id:      z.string().nullish(),
                            creator: z.boolean().nullish(),
                            mod:     z.boolean().nullish(),
                        })
                        .loose(),
                )
                .nullish(),
            positions: z
                .array(
                    z
                        .object({
                            tokenId:      z.string().nullish(),
                            positionSize: z.string().nullish(),
                        })
                        .loose(),
                )
                .nullish(),
        })
        .loose()
}
export type Profile = z.infer<typeof Profile.Schema>

export namespace Reaction {
    export const Schema = z
        .object({
            id:           z.string().nullish(),
            commentID:    z.number().nullish(),
            reactionType: z.string().nullish(),
            icon:         z.string().nullish(),
            userAddress:  z.string().nullish(),
            createdAt:    z.string().nullish(),
            profile:      Profile.Schema.nullish(),
        })
        .loose()
}
export type Reaction = z.infer<typeof Reaction.Schema>

export namespace Comment {
    export const Id = z.coerce.string().trim().brand("PolymarketGammaCommentId")
    export type Id = z.infer<typeof Id>

    export const ParentEntityType = z.enum(["Event", "Series", "market"])
    export type ParentEntityType = z.infer<typeof ParentEntityType>

    export const Schema = z
        .object({
            id:               Id,
            body:             z.string().nullish(),
            parentEntityType: z.string().nullish(),
            parentEntityID:   z.number().nullish(),
            parentCommentID:  z.string().nullish(),
            userAddress:      z.string().nullish(),
            replyAddress:     z.string().nullish(),
            createdAt:        z.string().nullish(),
            updatedAt:        z.string().nullish(),
            profile:          Profile.Schema.nullish(),
            reactions:        z.array(Reaction.Schema).nullish(),
            reportCount:      z.number().nullish(),
            reactionCount:    z.number().nullish(),
        })
        .loose()
}
export type Comment = z.infer<typeof Comment.Schema>

export namespace Team {
    export const Schema = z
        .object({
            id:           z.union([z.string(), z.number()]),
            name:         z.string().nullish(),
            league:       z.string().nullish(),
            record:       z.string().nullish(),
            logo:         z.string().nullish(),
            abbreviation: z.string().nullish(),
            alias:        z.string().nullish(),
            providerId:   z.union([z.string(), z.number()]).nullish(),
            color:        z.string().nullish(),
            createdAt:    z.string().nullish(),
            updatedAt:    z.string().nullish(),
        })
        .loose()
}
export type Team = z.infer<typeof Team.Schema>

export namespace Sport {
    export const Schema = z
        .object({
            id:         z.union([z.string(), z.number()]).nullish(),
            sport:      z.string(),
            image:      z.string().nullish(),
            resolution: z.string().nullish(),
            ordering:   z.string().nullish(),
            tags:       z.string().nullish(),
            series:     z.string().nullish(),
            createdAt:  z.string().nullish(),
        })
        .loose()
}
export type Sport = z.infer<typeof Sport.Schema>

export namespace Search {
    export const TagResult = Tag.Schema.extend({
        event_count: z.number().nullish(),
    }).loose()

    export const Pagination = z
        .object({
            hasMore:      z.boolean(),
            totalResults: z.number(),
        })
        .loose()

    export const Response = z
        .object({
            events:     z.array(Event.Schema).nullish(),
            tags:       z.array(TagResult).nullish(),
            profiles:   z.array(Profile.Schema).nullish(),
            pagination: Pagination,
        })
        .loose()
}
export type Search = z.infer<typeof Search.Response>
