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
exports.HyperLiquid = void 0;
const AccountMod = __importStar(require("./account"));
const APIMod = __importStar(require("./api"));
const CandleMod = __importStar(require("./candle"));
const MarketMod = __importStar(require("./market"));
const OrderBookMod = __importStar(require("./orderBook"));
/** PretzelGraph's stable, public-read Hyperliquid vocabulary. */
var HyperLiquid;
(function (HyperLiquid) {
    HyperLiquid.API = APIMod.HyperLiquidAPI;
    HyperLiquid.Account = AccountMod.Account;
    HyperLiquid.Candle = CandleMod.Candle;
    HyperLiquid.Market = MarketMod.Market;
    HyperLiquid.Mid = MarketMod.Mid;
    HyperLiquid.OrderBook = OrderBookMod.OrderBook;
})(HyperLiquid || (exports.HyperLiquid = HyperLiquid = {}));
