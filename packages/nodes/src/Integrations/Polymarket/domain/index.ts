import * as GammaMod from "./Gamma"
import * as DataMod from "./Data"
import * as CLOBMod from "./CLOB"
import * as MarketMod from "./market"
import * as MarketStatsMod from "./marketStats"
import * as EventMod from "./event"
import * as EventStatsMod from "./eventStats"
import * as ActivityMod from "./activity"
import * as HolderMod from "./holder"
import * as OrderBookMod from "./orderBook"
import * as PositionMod from "./position"
import * as SeriesMod from "./series"
import * as SeriesStatsMod from "./seriesStats"
import * as SportMod from "./sport"
import * as TagMod from "./tag"

export namespace Polymarket {
    // The APIs Polymarket exposes — each strongly describing its stable, useful surface.
    export import Gamma = GammaMod.Gamma
    export import Data  = DataMod.Data
    export import CLOB  = CLOBMod.CLOB

    // Ours, sitting across them.
    export import Market      = MarketMod.Market
    export import MarketStats = MarketStatsMod.MarketStats
    export import Event       = EventMod.Event
    export import EventStats  = EventStatsMod.EventStats
    export import Activity    = ActivityMod.Activity
    export import Holder      = HolderMod.Holder
    export import OrderBook   = OrderBookMod.OrderBook
    export import Position    = PositionMod.Position
    export import Series      = SeriesMod.Series
    export import SeriesStats = SeriesStatsMod.SeriesStats
    export import Sport       = SportMod.Sport
    export import Team        = SportMod.Team
    export import Tag         = TagMod.Tag
}
