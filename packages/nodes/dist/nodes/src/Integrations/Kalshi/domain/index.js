"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Kalshi = void 0;
const EventMod = __importStar(require("./event"));
const ExchangeMod = __importStar(require("./exchange"));
const MarketMod = __importStar(require("./market"));
const OrderBookMod = __importStar(require("./orderBook"));
const PriceHistoryMod = __importStar(require("./priceHistory"));
const SeriesMod = __importStar(require("./series"));
const TradeMod = __importStar(require("./trade"));
/**
 * PretzelGraph's intentionally small Kalshi vocabulary.
 *
 * The official generated package remains the wire contract. These are only the stable concepts
 * that nodes expose, added when a generated response benefits from renaming, compaction or
 * combining multiple endpoints.
 */
var Kalshi;
(function (Kalshi) {
    Kalshi.Event = EventMod.Event;
    Kalshi.Exchange = ExchangeMod.Exchange;
    Kalshi.Market = MarketMod.Market;
    Kalshi.OrderBook = OrderBookMod.OrderBook;
    Kalshi.PriceHistory = PriceHistoryMod.PriceHistory;
    Kalshi.Series = SeriesMod.Series;
    Kalshi.Trade = TradeMod.Trade;
})(Kalshi || (exports.Kalshi = Kalshi = {}));
