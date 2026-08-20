"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const client_1 = require("../client");
const tools_1 = require("./tools");
class Node extends node_sdk_1.RuntimeNode {
    #info;
    constructor(nodeId, context) {
        super(nodeId, context);
        this.#info = new client_1.HyperLiquidInfoClient(this.httpClientFactory);
    }
    async onRun() {
        const fields = this.fieldValues;
        if (fields.isConvertedToTool === true)
            return {
                tools: (0, tools_1.buildTools)(this.#info, {
                    address: fields.address,
                    dex: fields.dex,
                }),
            };
        switch (fields.resource) {
            case "state":
                return {
                    state: (await this.#info.accountState({
                        user: fields.address,
                        dex: fields.dex,
                    })).state,
                };
            case "positions":
                return {
                    positions: (await this.#info.accountState({
                        user: fields.address,
                        dex: fields.dex,
                    })).positions,
                };
            case "spotBalances":
                return {
                    spotBalances: await this.#info.spotBalances(fields.address),
                };
            case "openOrders":
                return {
                    openOrders: await this.#info.openOrders({
                        user: fields.address,
                        dex: fields.dex,
                    }),
                };
            case "fills": {
                const endTime = Date.now();
                return {
                    fills: await this.#info.fills({
                        user: fields.address,
                        startTime: endTime - fields.fillsLookbackHours * 60 * 60 * 1_000,
                        endTime,
                        maxResults: fields.fillsLimit,
                        aggregateByTime: fields.fillsAggregateByTime,
                    }),
                };
            }
            case "funding": {
                const endTime = Date.now();
                return {
                    funding: await this.#info.funding({
                        user: fields.address,
                        startTime: endTime - fields.fundingLookbackHours * 60 * 60 * 1_000,
                        endTime,
                        maxResults: fields.fundingLimit,
                    }),
                };
            }
        }
    }
}
exports.Node = Node;
