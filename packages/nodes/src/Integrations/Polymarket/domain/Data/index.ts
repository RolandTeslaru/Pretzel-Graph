import * as DataSchemaMod from "./schemas"
import * as DataAPIMod from "./api"

export namespace Data {
    export import Common      = DataSchemaMod.Common
    export import Status      = DataSchemaMod.Status
    export import Combo       = DataSchemaMod.Combo
    export import Position    = DataSchemaMod.Position
    export import Trade       = DataSchemaMod.Trade
    export import Activity    = DataSchemaMod.Activity
    export import Holder      = DataSchemaMod.Holder
    export import User        = DataSchemaMod.User
    export import Market      = DataSchemaMod.Market
    export import Leaderboard = DataSchemaMod.Leaderboard
    export import Builder     = DataSchemaMod.Builder
    export import Accounting  = DataSchemaMod.Accounting
    export import API         = DataAPIMod.DataAPI
}
