import * as CLOBSchemaMod from "./schemas"
import * as CLOBAPIMod from "./api"

export namespace CLOB {
    export import Common           = CLOBSchemaMod.Common
    export import ApiCredentials   = CLOBSchemaMod.ApiCredentials
    export import PriceLevel       = CLOBSchemaMod.PriceLevel
    export import Token            = CLOBSchemaMod.Token
    export import Reward           = CLOBSchemaMod.Reward
    export import Market           = CLOBSchemaMod.Market
    export import OrderBook        = CLOBSchemaMod.OrderBook
    export import MarketData       = CLOBSchemaMod.MarketData
    export import Order            = CLOBSchemaMod.Order
    export import Trade            = CLOBSchemaMod.Trade
    export import BalanceAllowance = CLOBSchemaMod.BalanceAllowance
    export import Notification     = CLOBSchemaMod.Notification
    export import Builder          = CLOBSchemaMod.Builder
    export import MarketTradeEvent = CLOBSchemaMod.MarketTradeEvent
    export import API              = CLOBAPIMod.CLOBAPI
}
