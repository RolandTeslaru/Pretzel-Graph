import * as EventMod from "./event"
import * as ExchangeMod from "./exchange"
import * as MarketMod from "./market"
import * as OrderBookMod from "./orderBook"
import * as PriceHistoryMod from "./priceHistory"
import * as SeriesMod from "./series"
import * as TradeMod from "./trade"


/**
 * PretzelGraph's intentionally small Kalshi vocabulary.
 *
 * The official generated package remains the wire contract. These are only the stable concepts
 * that nodes expose, added when a generated response benefits from renaming, compaction or
 * combining multiple endpoints.
 */
export namespace Kalshi {
    export import Event        = EventMod.Event
    export import Exchange     = ExchangeMod.Exchange
    export import Market       = MarketMod.Market
    export import OrderBook    = OrderBookMod.OrderBook
    export import PriceHistory = PriceHistoryMod.PriceHistory
    export import Series       = SeriesMod.Series
    export import Trade        = TradeMod.Trade
}
