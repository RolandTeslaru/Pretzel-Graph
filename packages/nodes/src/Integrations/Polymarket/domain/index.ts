import * as GammaMod from "./Gamma"
import * as DataMod from "./Data"
import * as CLOBMod from "./CLOB"
import * as MarketMod from "./market"
import * as EventMod from "./event"

export namespace Polymarket {
    // The APIs Polymarket exposes — each strongly describing its stable, useful surface.
    export import Gamma = GammaMod.Gamma
    export import Data  = DataMod.Data
    export import CLOB  = CLOBMod.CLOB

    // Ours, sitting across them.
    export import Market = MarketMod.Market
    export import Event  = EventMod.Event
}
