"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineTool = void 0;
exports.defineBlueprint = defineBlueprint;
const networkProxy_1 = require("../../credentials/networkProxy");
const field_1 = require("../field");
const derivatives_1 = require("./derivatives");
var tool_1 = require("./tool");
Object.defineProperty(exports, "defineTool", { enumerable: true, get: function () { return tool_1.defineTool; } });
function defineBlueprint(definition) {
    // itemScope is a free string — validate it names a real input port at module load.
    if (definition.itemScope !== undefined && !definition.inputs.some(i => i.id === definition.itemScope))
        throw new Error(`defineBlueprint(${definition.id}): itemScope "${definition.itemScope}" is not a declared input port id`);
    const baseFields = [
        ...definition.fields,
        ...field_1.FieldBuilder.DEFAULTS.StandardNode,
    ];
    const withDefaults = (definition.toolCompatible
        ? [...baseFields, field_1.FieldBuilder.DEFAULTS.toolConvertedField]
        : baseFields);
    // Framework defaults are in the pool before conditions are checked, so a blueprint can
    // branch on "isConvertedToTool==true" without declaring the field.
    const { derivatives, discriminantIds } = (0, derivatives_1.compileDerivatives)(definition.id, definition, withDefaults);
    const fields = (0, derivatives_1.stampDiscriminants)(withDefaults, discriminantIds);
    return {
        id: definition.id,
        ui: {
            displayName: definition.displayName,
            description: definition.description,
            icon: definition.icon,
            accent: definition.accent,
            iconColor: definition.iconColor,
        },
        fields,
        inputs: definition.inputs,
        outputs: definition.outputs,
        webhooks: definition.webhooks,
        toolCompatible: definition.toolCompatible,
        proxyCompatible: definition.proxyCompatible,
        igniter: definition.igniter,
        passive: definition.passive,
        credentials: (definition.proxyCompatible
            ? [...(definition.credentials ?? []), networkProxy_1.NetworkProxyCredential]
            : (definition.credentials ?? [])),
        flags: definition.flags,
        itemScope: definition.itemScope,
        // Omitted entirely when there are no condition keys, so existing blueprints serialize
        // byte-identically to before.
        ...(derivatives.length ? { _derivatives: derivatives } : {}),
    };
}
