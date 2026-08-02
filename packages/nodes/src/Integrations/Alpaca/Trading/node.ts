import {
    RegisterNode,
    RuntimeNode,
    type InferOutputs,
} from "@pretzel-graph/node-sdk"
import { Workflow } from "@pretzel-graph/shared/domain"

import {
    createAlpacaClient,
    parseAlpacaCredentials,
} from "../client"
import { AlpacaTradingService, type SubmitOrderArgs } from "../services"
import { Blueprint } from "./blueprint"
import { buildTools } from "./tools"


@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        const fields  = this.fieldValues
        const trading = this.trading

        if (fields.isConvertedToTool === true)
            return {
                tools: buildTools(trading),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>

        switch (fields.action) {
            case "submit": {
                const args: SubmitOrderArgs = {
                    type:           fields.orderType,
                    symbol:         fields.submitSymbol,
                    side:           fields.submitSide,
                    timeInForce:    fields.submitTimeInForce,
                    extendedHours: fields.extendedHours,
                    clientOrderId: fields.clientOrderId,
                    confirmLive:   fields.submitConfirmLive,
                }

                if (fields.orderType === "market") {
                    args.quantity = fields.marketQuantity
                    args.notional = fields.marketNotional
                }
                else if (fields.orderType === "limit") {
                    args.quantity   = fields.limitQuantity
                    args.limitPrice = fields.limitPrice
                }
                else if (fields.orderType === "stop") {
                    args.quantity  = fields.stopQuantity
                    args.stopPrice = fields.stopPrice
                }
                else if (fields.orderType === "stop_limit") {
                    args.quantity   = fields.stopLimitQuantity
                    args.stopPrice  = fields.stopLimitStopPrice
                    args.limitPrice = fields.stopLimitLimitPrice
                }
                else {
                    args.quantity = fields.trailingQuantity

                    if (fields.trailingMode === "price")
                        args.trailPrice = fields.trailingPrice
                    else
                        args.trailPercent = fields.trailingPercent
                }

                return {
                    order: await trading.submit(args),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>
            }

            case "replace":
                return {
                    order: await trading.replace({
                        orderId:       fields.replaceOrderId,
                        quantity:      fields.replaceQuantity,
                        limitPrice:    fields.replaceLimitPrice,
                        stopPrice:     fields.replaceStopPrice,
                        trail:         fields.replaceTrail,
                        timeInForce:   fields.replaceTimeInForce,
                        clientOrderId: fields.replaceClientOrderId,
                        confirmLive:   fields.replaceConfirmLive,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "cancel":
                return {
                    result: await trading.cancel(fields.cancelOrderId, fields.cancelConfirmLive),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "cancelAll":
                return {
                    result: await trading.cancelAll(fields.cancelAllConfirmLive),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "closePosition":
                return {
                    order: await trading.closePosition({
                        symbolOrId: fields.closeSymbolOrId,
                        quantity: fields.closeAmountType === "quantity"
                            ? fields.closeQuantity
                            : undefined,
                        percentage: fields.closeAmountType === "percentage"
                            ? fields.closePercentage
                            : undefined,
                        confirmLive: fields.closeConfirmLive,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "closeAll":
                return {
                    result: await trading.closeAllPositions({
                        cancelOrders: fields.closeAllCancelOrders,
                        confirmLive:  fields.closeAllConfirmLive,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "exerciseOption":
                return {
                    result: await trading.exerciseOption(
                        fields.exerciseSymbolOrId,
                        fields.exerciseConfirmLive,
                    ),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>
        }
    }


    #trading: AlpacaTradingService | undefined

    private get trading(): AlpacaTradingService {
        if (this.#trading)
            return this.#trading

        const instance = this.credentials.alpacaApi
        if (!instance)
            throw new Error("Alpaca Trading: attach an Alpaca credential.")

        const values = this.context.credentialsAPI.getDecryptedValue(instance.blob)
        const client = createAlpacaClient(
            this.httpClientFactory,
            parseAlpacaCredentials(values),
        )

        return (this.#trading = new AlpacaTradingService(client))
    }


    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context)
    }
}
