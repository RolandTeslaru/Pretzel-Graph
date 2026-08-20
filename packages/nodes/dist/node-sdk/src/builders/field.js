"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldBuilder = void 0;
var FieldBuilder;
(function (FieldBuilder) {
    FieldBuilder.buildBase = (id, displayName, options) => {
        return {
            id: id,
            displayName,
            tooltip: options.tooltip,
            required: options.required ?? false,
            advanced: options.advanced ?? false,
            reconcile: false, // derivative compilation stamps condition fields true
            hidden: options.hidden,
            ...buildItemScoped(options.itemScoped),
        };
    };
    /** Only include `isExpressionInitially` in the built field when explicitly true — keeps it out of serialization otherwise. */
    const buildIsExpression = (isExpressionInitially) => isExpressionInitially ? { isExpressionInitially: true } : {};
    /**
     * Locks a field to one mode, removing the editor's Static/Expression toggle.
     *
     *   "expression" — a literal would make the node meaningless (a router that can't branch,
     *                  a filter that can't see $item). Coercion still comes from the variant.
     *   "static"     — the value decides the graph's *shape* (derivative discriminants,
     *                  exposed-port config), resolved before any airlock exists to evaluate it.
     */
    const buildOnly = (only) => only ? { only } : {};
    /** Only include `itemScoped` when explicitly true — keeps it out of serialization otherwise. */
    const buildItemScoped = (itemScoped) => itemScoped ? { itemScoped: true } : {};
    /**
     * Marks a field as item-scoped: the engine skips it during eager field evaluation, and the
     * node resolves it per-element via RuntimeNode.evalItemField with $item bound. Excluded from
     * `this.fieldValues` (InferFieldValues) and surfaced in `evalItemField`'s key set (InferItemFields).
     *
     * Prefer the inline `itemScoped: true` option. This wrapper is useful when composing fields.
     *
     * @example FieldBuilder.itemScoped(FieldBuilder.Boolean("condition", "Condition", { isExpressionInitially: true }))
     */
    function itemScoped(field) {
        return { ...field, itemScoped: true };
    }
    FieldBuilder.itemScoped = itemScoped;
    function UniqueString(id, displayName, options = {}) {
        return {
            ...FieldBuilder.buildBase(id, displayName, options),
            variant: "UniqueString",
            placeholder: options.placeholder ?? "",
            prefix: options.prefix,
            length: options.length,
            // Placeholder; real value is generated per-node at create time.
            initialValue: "",
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        };
    }
    FieldBuilder.UniqueString = UniqueString;
    function String(id, displayName, options = {}) {
        return {
            ...FieldBuilder.buildBase(id, displayName, options),
            variant: "String",
            placeholder: options.placeholder ?? "",
            initialValue: options.initialValue ?? "",
            multiline: options.multiline ?? false,
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        };
    }
    FieldBuilder.String = String;
    function Integer(id, displayName, options = {}) {
        return {
            ...FieldBuilder.buildBase(id, displayName, options),
            variant: "Integer",
            initialValue: options.initialValue,
            min: options.min,
            max: options.max,
            step: options.step ?? 1,
            slider: options.slider,
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        };
    }
    FieldBuilder.Integer = Integer;
    function Float(id, displayName, options = {}) {
        return {
            ...FieldBuilder.buildBase(id, displayName, options),
            variant: "Float",
            initialValue: options.initialValue ?? 0.0,
            min: options.min,
            max: options.max,
            step: options.step ?? 0.1,
            slider: options.slider,
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        };
    }
    FieldBuilder.Float = Float;
    function Boolean(id, displayName, options = {}) {
        return {
            ...FieldBuilder.buildBase(id, displayName, options),
            variant: "Boolean",
            initialValue: options.initialValue ?? false,
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        };
    }
    FieldBuilder.Boolean = Boolean;
    function MultiOption(id, displayName, options) {
        return {
            ...FieldBuilder.buildBase(id, displayName, options),
            variant: "MultiOption",
            initialValue: options.initialValue,
            options: options.options,
            kind: options.variant ?? "select",
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        };
    }
    FieldBuilder.MultiOption = MultiOption;
    function File(id, displayName, options = {}) {
        return {
            ...FieldBuilder.buildBase(id, displayName, options),
            variant: "File",
            initialValue: options.initialValue ?? "",
            fileTypes: options.fileTypes,
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        };
    }
    FieldBuilder.File = File;
    function List(id, displayName, options = {}) {
        return {
            ...FieldBuilder.buildBase(id, displayName, options),
            variant: "List",
            initialValue: options.initialValue ?? [],
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        };
    }
    FieldBuilder.List = List;
    function Json(id, displayName, options = {}) {
        return {
            ...FieldBuilder.buildBase(id, displayName, options),
            variant: "Json",
            initialValue: options.initialValue ?? {},
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        };
    }
    FieldBuilder.Json = Json;
    function Password(id, displayName, options = {}) {
        return {
            ...FieldBuilder.buildBase(id, displayName, options),
            variant: "Password",
            initialValue: "",
            placeholder: options.placeholder,
        };
    }
    FieldBuilder.Password = Password;
    function Secret(id, displayName, options = {}) {
        return {
            ...FieldBuilder.buildBase(id, displayName, options),
            variant: "Secret",
            initialValue: options.initialValue ?? "",
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        };
    }
    FieldBuilder.Secret = Secret;
    function Script(id, displayName, options = {}) {
        return {
            ...FieldBuilder.buildBase(id, displayName, options),
            variant: "Script",
            initialValue: options.initialValue ?? "",
        };
    }
    FieldBuilder.Script = Script;
    function CaseList(id, displayName, options = {}) {
        return {
            ...FieldBuilder.buildBase(id, displayName, options),
            variant: "CaseList",
            initialValue: options.initialValue ?? [],
        };
    }
    FieldBuilder.CaseList = CaseList;
    function Variadic(id, displayName, options) {
        return {
            ...FieldBuilder.buildBase(id, displayName, options),
            variant: "Variadic",
            initialValue: [],
            groupId: options.groupId,
        };
    }
    FieldBuilder.Variadic = Variadic;
    function Condition(id, displayName, options = {}) {
        const rootId = "root";
        return {
            ...FieldBuilder.buildBase(id, displayName, options),
            variant: "Condition",
            initialValue: options.initialValue ?? {
                rootId,
                rules: {
                    "rule1": { id: "rule1", dataType: "string", leftOperand: "", operator: "equals", rightOperand: "" }
                },
                groups: {
                    [rootId]: { id: rootId, combinator: "AND", children: ["rule1"] },
                },
            },
        };
    }
    FieldBuilder.Condition = Condition;
    function ResourceLoader(id, displayName, options) {
        return {
            ...FieldBuilder.buildBase(id, displayName, options),
            variant: "ResourceLoader",
            loaderId: options.loaderId,
            dependsOn: (options.dependsOn ?? []),
            placeholder: options.placeholder ?? "",
            initialValue: options.initialValue ?? { mode: "list", value: "" },
        };
    }
    FieldBuilder.ResourceLoader = ResourceLoader;
    function CalendarRange(id, displayName, options = {}) {
        return {
            ...FieldBuilder.buildBase(id, displayName, options),
            variant: "CalendarRange",
            initialValue: options.initialValue ?? {},
            placeholder: options.placeholder,
            maxDate: options.maxDate,
        };
    }
    FieldBuilder.CalendarRange = CalendarRange;
    function CalendarDateTimeRange(id, displayName, options = {}) {
        return {
            ...FieldBuilder.buildBase(id, displayName, options),
            variant: "CalendarDateTimeRange",
            initialValue: options.initialValue ?? { startTime: "", endTime: "" },
            placeholder: options.placeholder,
        };
    }
    FieldBuilder.CalendarDateTimeRange = CalendarDateTimeRange;
    // Framework-owned fields appended to every blueprint by defineBlueprint. They are also
    // passed to the shape compiler as ambient fields, so a blueprint can branch on one
    // ("isConvertedToTool=true") without declaring it.
    let DEFAULTS;
    (function (DEFAULTS) {
        DEFAULTS.toolConvertedField = FieldBuilder.Boolean("isConvertedToTool", "Tool Mode", {
            hidden: true,
            initialValue: false,
        });
        DEFAULTS.signalDependencyStrategyField = FieldBuilder.MultiOption("signalDependency", "Signal Dependency", {
            options: [
                { value: "AND", displayName: "(AND) All signals required", description: "Fire only once every upstream signal has arrived." },
                { value: "OR", displayName: "(OR) At least one signal required", description: "Fire as soon as any upstream signal arrives (re-fires on each — enables cycles)." },
                { value: "XOR", displayName: "(XOR) Exactly one signal required", description: "Fire on exactly one signal. If two or more arrive at once, the run fails with a collision error." },
            ],
            initialValue: "OR",
            tooltip: "Determines how incoming signals are evaluated to trigger node execution.",
        });
        DEFAULTS.dataDependencyStrategyField = FieldBuilder.MultiOption("dataDependency", "Data Dependency", {
            options: [
                { value: "AND", displayName: "Wait & Join", description: "Wait until every wired input port has resolved, then read all of them." },
                { value: "OR", displayName: "Follow Trigger", description: "Don't wait — read only the input port(s) that propagated the triggering signal." },
            ],
            initialValue: "AND",
            tooltip: "Controls how the node gathers its inputs once it's been triggered: wait for all wired ports, or read only the ones that fired.",
        });
        DEFAULTS.onErrorStrategyField = FieldBuilder.MultiOption("onErrorStrategy", "On Error", {
            options: [
                { value: "terminate", displayName: "Terminate workflow", description: "Fail the whole run." },
                { value: "propagate", displayName: "Propagate error", description: "Forward the error along outgoing edges." },
                { value: "do_nothing", displayName: "Do nothing", description: "Swallow the error — no signal, no termination. Downstream stalls." },
            ],
            initialValue: "propagate",
            tooltip: "What happens when this node's execution throws.",
        });
        DEFAULTS.StandardNode = [
            DEFAULTS.signalDependencyStrategyField,
            DEFAULTS.dataDependencyStrategyField,
            DEFAULTS.onErrorStrategyField,
        ];
        DEFAULTS.TOOL_FIELDS = [DEFAULTS.toolConvertedField];
        // `field.id as string`, not String(...) — inside this namespace `String` is
        // FieldBuilder.String, the builder, not the global.
        DEFAULTS.IDS = new Set([...DEFAULTS.StandardNode, ...DEFAULTS.TOOL_FIELDS].map(field => field.id));
        // Return type stays precise — the shape compiler infers ambient field value types from it.
        // Tupled so anything that isn't literally `true` (a widened boolean, undefined) takes
        // the non-tool set.
        function forBlueprint(toolCompatible) {
            return (toolCompatible ? [...DEFAULTS.StandardNode, ...DEFAULTS.TOOL_FIELDS] : DEFAULTS.StandardNode);
        }
        DEFAULTS.forBlueprint = forBlueprint;
    })(DEFAULTS = FieldBuilder.DEFAULTS || (FieldBuilder.DEFAULTS = {}));
})(FieldBuilder || (exports.FieldBuilder = FieldBuilder = {}));
