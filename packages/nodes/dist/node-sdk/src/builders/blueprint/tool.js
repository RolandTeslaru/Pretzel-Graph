"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineTool = defineTool;
/**
 * Declares a node's tool-mode surface.
 *
 * Pairs with a framework condition key, replacing the run-mode structure wholesale rather than
 * layering onto it:
 *
 *     "isConvertedToTool==true": defineTool({
 *         fields:  [FieldBuilder.Integer("maxResults", "Default Max Results", { initialValue: 20 })],
 *         outputs: [OutputBuilder.ToolList("tools", "Tools")],
 *     })
 *
 * Terminal by construction — it opens no scope, so nothing nests inside it and no condition below
 * can reference its fields. That's what keeps tool mode from multiplying the field-values union:
 * a node is either configured for one action or exposing all of them, never both.
 *
 * Framework fields (isConvertedToTool, the execution strategies) survive the replacement, so the
 * editor can still toggle back out of tool mode.
 */
function defineTool(body) {
    return {
        ...body,
        // A tool node is a tool node — colour it without every author having to remember.
        // Spread order lets an explicit accent win.
        ui: { accent: "port-Tool", ...body.ui },
        __tool: true,
    };
}
