import * as AccountMod from "./account"
import * as MarketMod from "./market"
import * as TradingMod from "./trading"


/** Stable, compact graph-facing shapes; the official Alpaca package remains the wire contract. */
export namespace Alpaca {
    export namespace Market {
        export import Asset          = MarketMod.Asset
        export import Bar            = MarketMod.Bar
        export import Trade          = MarketMod.Trade
        export import Quote          = MarketMod.Quote
        export import Snapshot       = MarketMod.Snapshot
        export import NewsArticle    = MarketMod.NewsArticle
        export import OptionContract = MarketMod.OptionContract
        export import OptionSnapshot = MarketMod.OptionSnapshot
        export import Clock          = MarketMod.MarketClock
        export import CalendarDay    = MarketMod.CalendarDay
        export import Screener       = MarketMod.Screener
    }

    export namespace Account {
        export import Summary   = AccountMod.Summary
        export import Position  = AccountMod.Position
        export import Portfolio = AccountMod.Portfolio
        export import Watchlist = AccountMod.Watchlist
    }

    export namespace Trading {
        export import Order    = TradingMod.Order
        export import Mutation = TradingMod.Mutation
    }
}

export * from "./common"
