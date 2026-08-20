"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mutation = exports.Order = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
var Order;
(function (Order) {
    Order.Schema = zod_1.z.object({
        id: zod_1.z.string().nullable(),
        clientOrderId: zod_1.z.string().nullable(),
        symbol: zod_1.z.string().nullable(),
        assetClass: zod_1.z.string().nullable(),
        side: zod_1.z.string().nullable(),
        type: zod_1.z.string(),
        orderClass: zod_1.z.string().nullable(),
        timeInForce: zod_1.z.string(),
        status: zod_1.z.string().nullable(),
        quantity: zod_1.z.string().nullable(),
        notional: zod_1.z.string().nullable(),
        filledQuantity: zod_1.z.string().nullable(),
        filledPrice: zod_1.z.string().nullable(),
        limitPrice: zod_1.z.string().nullable(),
        stopPrice: zod_1.z.string().nullable(),
        trailPrice: zod_1.z.string().nullable(),
        trailPercent: zod_1.z.string().nullable(),
        extendedHours: zod_1.z.boolean(),
        submittedAt: zod_1.z.string().nullable(),
        filledAt: zod_1.z.string().nullable(),
        canceledAt: zod_1.z.string().nullable(),
        replacedBy: zod_1.z.string().nullable(),
        replaces: zod_1.z.string().nullable(),
    });
    Order.fromAPI = (value) => ({
        id: value.id ?? null,
        clientOrderId: value.clientOrderId ?? null,
        symbol: value.symbol ?? null,
        assetClass: value.assetClass ?? null,
        side: value.side ?? null,
        type: value.type,
        orderClass: value.orderClass ?? null,
        timeInForce: value.timeInForce,
        status: value.status ?? null,
        quantity: value.qty ?? null,
        notional: value.notional ?? null,
        filledQuantity: value.filledQty ?? null,
        filledPrice: value.filledAvgPrice ?? null,
        limitPrice: value.limitPrice ?? null,
        stopPrice: value.stopPrice ?? null,
        trailPrice: value.trailPrice ?? null,
        trailPercent: value.trailPercent ?? null,
        extendedHours: value.extendedHours ?? false,
        submittedAt: (0, common_1.iso)(value.submittedAt),
        filledAt: (0, common_1.iso)(value.filledAt),
        canceledAt: (0, common_1.iso)(value.canceledAt),
        replacedBy: value.replacedBy ?? null,
        replaces: value.replaces ?? null,
    });
})(Order || (exports.Order = Order = {}));
var Mutation;
(function (Mutation) {
    Mutation.ResultSchema = zod_1.z.object({
        target: zod_1.z.string().nullable(),
        status: zod_1.z.number().int().nullable(),
        succeeded: zod_1.z.boolean(),
        order: Order.Schema.nullable(),
    });
    Mutation.Schema = zod_1.z.object({
        action: zod_1.z.string(),
        environment: zod_1.z.enum(["paper", "live"]),
        succeeded: zod_1.z.boolean(),
        target: zod_1.z.string().nullable(),
        order: Order.Schema.nullable(),
        results: zod_1.z.array(Mutation.ResultSchema),
    });
})(Mutation || (exports.Mutation = Mutation = {}));
