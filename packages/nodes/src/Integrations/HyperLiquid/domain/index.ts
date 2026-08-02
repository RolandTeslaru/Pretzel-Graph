import * as AccountMod from "./account";
import * as APIMod from "./api";
import * as CandleMod from "./candle";
import * as MarketMod from "./market";
import * as OrderBookMod from "./orderBook";


/** PretzelGraph's stable, public-read Hyperliquid vocabulary. */
export namespace HyperLiquid {
    export import API           = APIMod.HyperLiquidAPI;
    export import Account       = AccountMod.Account;
    export import Candle        = CandleMod.Candle;
    export import Market        = MarketMod.Market;
    export import Mid           = MarketMod.Mid;
    export import OrderBook     = OrderBookMod.OrderBook;
}
