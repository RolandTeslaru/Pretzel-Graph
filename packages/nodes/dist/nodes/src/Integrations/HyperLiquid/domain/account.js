"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Account = void 0;
const zod_1 = require("zod");
const api_1 = require("./api");
var Account;
(function (Account) {
    Account.Margin = api_1.HyperLiquidAPI.MarginSummary;
    Account.State = zod_1.z.object({
        dex: zod_1.z.string(),
        time: zod_1.z.number().int().nullable(),
        margin: Account.Margin,
        crossMargin: Account.Margin,
        crossMaintenanceMarginUsed: zod_1.z.string().nullable(),
        withdrawable: zod_1.z.string(),
    });
    Account.Position = api_1.HyperLiquidAPI.Position;
    Account.OpenOrder = api_1.HyperLiquidAPI.OpenOrder;
    Account.Fill = api_1.HyperLiquidAPI.Fill;
    Account.FundingPayment = api_1.HyperLiquidAPI.FundingPayment;
    Account.SpotBalance = api_1.HyperLiquidAPI.SpotBalance;
    Account.stateFromAPI = (dex, state) => ({
        dex,
        time: state.time ?? null,
        margin: state.marginSummary,
        crossMargin: state.crossMarginSummary,
        crossMaintenanceMarginUsed: state.crossMaintenanceMarginUsed ?? null,
        withdrawable: state.withdrawable,
    });
    Account.positionsFromAPI = (state) => state.assetPositions.map(value => value.position);
})(Account || (exports.Account = Account = {}));
