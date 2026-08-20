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
exports.Polymarket = void 0;
const GammaMod = __importStar(require("./Gamma"));
const DataMod = __importStar(require("./Data"));
const CLOBMod = __importStar(require("./CLOB"));
const MarketMod = __importStar(require("./market"));
const MarketStatsMod = __importStar(require("./marketStats"));
const EventMod = __importStar(require("./event"));
const EventStatsMod = __importStar(require("./eventStats"));
const ActivityMod = __importStar(require("./activity"));
const HolderMod = __importStar(require("./holder"));
const OrderBookMod = __importStar(require("./orderBook"));
const PositionMod = __importStar(require("./position"));
const PriceHistoryMod = __importStar(require("./priceHistory"));
const ProfileMod = __importStar(require("./profile"));
const SeriesMod = __importStar(require("./series"));
const SeriesStatsMod = __importStar(require("./seriesStats"));
const SportMod = __importStar(require("./sport"));
const TagMod = __importStar(require("./tag"));
var Polymarket;
(function (Polymarket) {
    // The APIs Polymarket exposes — each strongly describing its stable, useful surface.
    Polymarket.Gamma = GammaMod.Gamma;
    Polymarket.Data = DataMod.Data;
    Polymarket.CLOB = CLOBMod.CLOB;
    // Ours, sitting across them.
    Polymarket.Market = MarketMod.Market;
    Polymarket.MarketStats = MarketStatsMod.MarketStats;
    Polymarket.Event = EventMod.Event;
    Polymarket.EventStats = EventStatsMod.EventStats;
    Polymarket.Activity = ActivityMod.Activity;
    Polymarket.Holder = HolderMod.Holder;
    Polymarket.OrderBook = OrderBookMod.OrderBook;
    Polymarket.Position = PositionMod.Position;
    Polymarket.PriceHistory = PriceHistoryMod.PriceHistory;
    Polymarket.Profile = ProfileMod.Profile;
    Polymarket.Series = SeriesMod.Series;
    Polymarket.SeriesStats = SeriesStatsMod.SeriesStats;
    Polymarket.Sport = SportMod.Sport;
    Polymarket.Team = SportMod.Team;
    Polymarket.Tag = TagMod.Tag;
})(Polymarket || (exports.Polymarket = Polymarket = {}));
