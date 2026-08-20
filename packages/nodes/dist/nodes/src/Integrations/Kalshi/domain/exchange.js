"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Exchange = void 0;
const zod_1 = require("zod");
var Exchange;
(function (Exchange) {
    Exchange.Status = zod_1.z.object({
        active: zod_1.z.boolean(),
        tradingActive: zod_1.z.boolean(),
        transfersActive: zod_1.z.boolean().nullable(),
        estimatedResumeTime: zod_1.z.string().nullable(),
    });
    Exchange.fromAPI = (status) => ({
        active: status.exchange_active,
        tradingActive: status.trading_active,
        transfersActive: status.intra_exchange_transfers_active ?? null,
        estimatedResumeTime: status.exchange_estimated_resume_time ?? null,
    });
})(Exchange || (exports.Exchange = Exchange = {}));
