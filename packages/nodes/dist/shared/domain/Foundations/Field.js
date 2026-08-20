"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Field = void 0;
const zod_1 = require("zod");
const utils_1 = require("../../utils");
var Field;
(function (Field) {
    Field.Id = zod_1.z.string().brand("FieldId");
    Field.Value = zod_1.z.any();
    Field.Base = zod_1.z.object({
        id: Field.Id,
        advanced: zod_1.z.boolean(),
        required: zod_1.z.boolean(),
        reconcile: zod_1.z.boolean(),
        hidden: zod_1.z.boolean().optional(),
        // When true, this field is NOT eagerly evaluated by the engine; the node evaluates it
        // per-item via RuntimeNode.evalItemField, with $item bound to the current element.
        itemScoped: zod_1.z.boolean().optional(),
        displayName: zod_1.z.string(),
        description: zod_1.z.string().optional(),
        tooltip: zod_1.z.string().optional(),
        groupId: zod_1.z.string().brand("GroupId").optional(),
    });
    Field.Variant = zod_1.z.enum([
        "Integer",
        "Float",
        "String",
        "UniqueString",
        "Password",
        "Secret",
        "Boolean",
        "MultiOption",
        "File",
        "Script",
        "Json",
        "List",
        "Condition",
        "CaseList",
        "Variadic",
        "ResourceLoader",
        "CalendarRange",
        "CalendarDateTimeRange",
    ]);
    function configLiteral(value) {
        return zod_1.z.literal(value);
    }
    Field.Integer = Field.Base.extend({
        variant: configLiteral("Integer"),
        initialValue: zod_1.z.int().optional(),
        min: zod_1.z.int().optional(),
        max: zod_1.z.int().optional(),
        step: zod_1.z.int().optional(),
        slider: zod_1.z.boolean().optional(),
        isExpressionInitially: zod_1.z.boolean().optional(),
        only: zod_1.z.enum(["static", "expression"]).optional(),
    });
    Field.Float = Field.Base.extend({
        variant: configLiteral("Float"),
        initialValue: zod_1.z.number(),
        min: zod_1.z.number().optional(),
        max: zod_1.z.number().optional(),
        step: zod_1.z.number().optional(),
        slider: zod_1.z.boolean().optional(),
        isExpressionInitially: zod_1.z.boolean().optional(),
        only: zod_1.z.enum(["static", "expression"]).optional(),
    });
    Field.String = Field.Base.extend({
        variant: configLiteral("String"),
        initialValue: zod_1.z.string(),
        multiline: zod_1.z.boolean(),
        placeholder: zod_1.z.string().optional(),
        isExpressionInitially: zod_1.z.boolean().optional(),
        only: zod_1.z.enum(["static", "expression"]).optional(),
    });
    Field.UniqueString = Field.Base.extend({
        variant: configLiteral("UniqueString"),
        initialValue: zod_1.z.string(),
        prefix: zod_1.z.string().optional(),
        length: zod_1.z.number().optional(),
        placeholder: zod_1.z.string().optional(),
        isExpressionInitially: zod_1.z.boolean().optional(),
        only: zod_1.z.enum(["static", "expression"]).optional(),
    });
    Field.Password = Field.Base.extend({
        variant: configLiteral("Password"),
        initialValue: zod_1.z.string(),
        placeholder: zod_1.z.string().optional(),
    });
    Field.Secret = Field.Base.extend({
        variant: configLiteral("Secret"),
        initialValue: zod_1.z.string(),
        isExpressionInitially: zod_1.z.boolean().optional(),
        only: zod_1.z.enum(["static", "expression"]).optional(),
    });
    Field.Boolean = Field.Base.extend({
        variant: configLiteral("Boolean"),
        initialValue: zod_1.z.boolean(),
        isExpressionInitially: zod_1.z.boolean().optional(),
        only: zod_1.z.enum(["static", "expression"]).optional(),
    });
    Field.MultiOption = Field.Base.extend({
        variant: configLiteral("MultiOption"),
        initialValue: zod_1.z.string(),
        placeholder: zod_1.z.string().optional(),
        options: zod_1.z.array(zod_1.z.object({
            value: zod_1.z.string(),
            displayName: zod_1.z.string().optional(),
            description: zod_1.z.string().optional(),
        })),
        kind: zod_1.z.enum(["select", "tab"]).default("select"),
        isExpressionInitially: zod_1.z.boolean().optional(),
        only: zod_1.z.enum(["static", "expression"]).optional(),
    });
    Field.File = Field.Base.extend({
        variant: configLiteral("File"),
        initialValue: zod_1.z.string(),
        fileTypes: zod_1.z.array(zod_1.z.string()).optional(),
        isExpressionInitially: zod_1.z.boolean().optional(),
        only: zod_1.z.enum(["static", "expression"]).optional(),
    });
    Field.Script = Field.Base.extend({
        variant: configLiteral("Script"),
        initialValue: zod_1.z.string(),
    });
    Field.Json = Field.Base.extend({
        variant: configLiteral("Json"),
        initialValue: zod_1.z.json(),
        isExpressionInitially: zod_1.z.boolean().optional(),
        only: zod_1.z.enum(["static", "expression"]).optional(),
    });
    Field.List = Field.Base.extend({
        variant: configLiteral("List"),
        initialValue: zod_1.z.array(zod_1.z.string()),
        isExpressionInitially: zod_1.z.boolean().optional(),
        only: zod_1.z.enum(["static", "expression"]).optional(),
    });
    Field.Variadic = Field.Base.extend({
        variant: configLiteral("Variadic"),
        initialValue: zod_1.z.array(zod_1.z.string()),
        groupId: zod_1.z.string().brand("GroupId"),
    });
    let Condition;
    (function (Condition) {
        Condition.DataType = zod_1.z.enum(["string", "number", "dateTime", "boolean", "array", "object"]);
        let Operator;
        (function (Operator) {
            Operator.shared = ["exists", "not_exists", "is_empty", "is_not_empty"];
            Operator.String = zod_1.z.enum([
                ...Operator.shared,
                "equals", "not_equals",
                "contains", "not_contains",
                "starts_with", "not_starts_with",
                "ends_with", "not_ends_with",
                "matches_regex", "not_matches_regex",
            ]);
            Operator.Number = zod_1.z.enum([
                ...Operator.shared,
                "equals", "not_equals",
                "greater_than", "less_than",
                "greater_than_or_equal", "less_than_or_equal",
            ]);
            Operator.DateTime = zod_1.z.enum([
                ...Operator.shared,
                "equals", "not_equals",
                "after", "before",
                "after_or_equal", "before_or_equal",
            ]);
            Operator.Boolean = zod_1.z.enum([
                ...Operator.shared,
                "is_true", "is_false",
                "equals", "not_equals",
            ]);
            Operator.Array = zod_1.z.enum([
                ...Operator.shared,
                "contains", "not_contains",
                "length_equals", "length_not_equals",
                "length_greater_than", "length_less_than",
                "length_greater_than_or_equal", "length_less_than_or_equal",
            ]);
            Operator.Object = zod_1.z.enum([
                ...Operator.shared,
            ]);
            Operator.Unary = zod_1.z.enum([
                ...Operator.shared,
                "is_true", "is_false",
            ]);
            Operator.Schema = zod_1.z.union([Operator.String, Operator.Number, Operator.DateTime, Operator.Boolean, Operator.Array, Operator.Object]);
            Operator.MAP = {
                string: Operator.String,
                number: Operator.Number,
                dateTime: Operator.DateTime,
                boolean: Operator.Boolean,
                array: Operator.Array,
                object: Operator.Object,
            };
        })(Operator = Condition.Operator || (Condition.Operator = {}));
        let Rule;
        (function (Rule) {
            Rule.Id = zod_1.z.string().brand("RuleId");
            Rule.createId = (id) => Rule.Id.parse(id || crypto.randomUUID());
            const Base = zod_1.z.object({
                id: Rule.Id,
                leftOperand: zod_1.z.string(),
                /** When true, leftOperand is a JS expression run through the airlock; else a literal. */
                leftIsExpression: zod_1.z.boolean().optional(),
                rightOperand: zod_1.z.string().optional(),
                rightIsExpression: zod_1.z.boolean().optional(),
            });
            Rule.String = Base.extend({ dataType: zod_1.z.literal("string"), operator: Operator.String });
            Rule.Number = Base.extend({ dataType: zod_1.z.literal("number"), operator: Operator.Number });
            Rule.DateTime = Base.extend({ dataType: zod_1.z.literal("dateTime"), operator: Operator.DateTime });
            Rule.Boolean = Base.extend({ dataType: zod_1.z.literal("boolean"), operator: Operator.Boolean });
            Rule.Array = Base.extend({ dataType: zod_1.z.literal("array"), operator: Operator.Array });
            Rule.Object = Base.extend({ dataType: zod_1.z.literal("object"), operator: Operator.Object });
            Rule.Schema = zod_1.z.discriminatedUnion("dataType", [
                Rule.String, Rule.Number, Rule.DateTime, Rule.Boolean, Rule.Array, Rule.Object,
            ]);
        })(Rule = Condition.Rule || (Condition.Rule = {}));
        let RuleGroup;
        (function (RuleGroup) {
            RuleGroup.Id = zod_1.z.string().brand("RuleGroupId");
            RuleGroup.createId = (id) => RuleGroup.Id.parse(id || crypto.randomUUID());
            RuleGroup.Schema = zod_1.z.object({
                id: RuleGroup.Id,
                combinator: zod_1.z.enum(["AND", "OR"]),
                children: zod_1.z.array(zod_1.z.union([Rule.Id, RuleGroup.Id])),
            });
        })(RuleGroup = Condition.RuleGroup || (Condition.RuleGroup = {}));
        Condition.Value = zod_1.z.object({
            rootId: RuleGroup.Id,
            rules: zod_1.z.record(Rule.Id, Rule.Schema),
            groups: zod_1.z.record(RuleGroup.Id, RuleGroup.Schema),
        });
        Condition.Schema = Field.Base.extend({
            variant: configLiteral("Condition"),
            initialValue: Condition.Value,
        });
        Condition.evaluateRule = utils_1.evaluateRule;
        Condition.evaluateRuleGroup = utils_1.evaluateRuleGroup;
        Condition.evaluate = utils_1.evaluateCondition;
    })(Condition = Field.Condition || (Field.Condition = {}));
    let CaseList;
    (function (CaseList) {
        // Pre-migration entries used a `condition` rule-tree instead of `value` —
        // normalize those to a safe default rather than failing to parse old workflows.
        CaseList.Entry = zod_1.z.preprocess((raw) => {
            if (raw && typeof raw === "object" && !("value" in raw) && "condition" in raw) {
                const { condition, ...rest } = raw;
                return { ...rest, value: false };
            }
            return raw;
        }, zod_1.z.object({
            portId: zod_1.z.string().brand("PortId").brand("OutputId"),
            label: zod_1.z.string(),
            value: zod_1.z.union([zod_1.z.boolean(), zod_1.z.string()]),
            isExpression: zod_1.z.boolean().optional(),
        }));
        CaseList.Value = zod_1.z.array(CaseList.Entry);
        CaseList.Schema = Field.Base.extend({
            variant: configLiteral("CaseList"),
            initialValue: CaseList.Value,
        });
        CaseList.createEntry = (portId, label) => ({
            portId: portId,
            label,
            value: "true",
            isExpression: true,
        });
    })(CaseList = Field.CaseList || (Field.CaseList = {}));
    let ResourceLoader;
    (function (ResourceLoader) {
        ResourceLoader.LoaderId = zod_1.z.string().brand("LoaderId");
        ResourceLoader.Mode = zod_1.z.enum(["list", "manual"]);
        ResourceLoader.Value = zod_1.z.object({
            mode: ResourceLoader.Mode,
            value: zod_1.z.string(),
        });
        ResourceLoader.OptionItem = zod_1.z.object({
            label: zod_1.z.string(),
            value: zod_1.z.string(),
            description: zod_1.z.string().optional(),
            icon: zod_1.z.string().optional(),
            url: zod_1.z.string().optional(),
        });
        ResourceLoader.Schema = Field.Base.extend({
            variant: configLiteral("ResourceLoader"),
            loaderId: ResourceLoader.LoaderId,
            dependsOn: zod_1.z.array(Field.Id).default([]),
            placeholder: zod_1.z.string().optional(),
            initialValue: ResourceLoader.Value,
        });
    })(ResourceLoader = Field.ResourceLoader || (Field.ResourceLoader = {}));
    let CalendarRange;
    (function (CalendarRange) {
        CalendarRange.Value = zod_1.z.object({
            from: zod_1.z.iso.date().optional(),
            to: zod_1.z.iso.date().optional(),
        });
        CalendarRange.Schema = Field.Base.extend({
            variant: configLiteral("CalendarRange"),
            initialValue: CalendarRange.Value,
            placeholder: zod_1.z.string().optional(),
            maxDate: zod_1.z.iso.date().optional(),
        });
    })(CalendarRange = Field.CalendarRange || (Field.CalendarRange = {}));
    let CalendarDateTimeRange;
    (function (CalendarDateTimeRange) {
        CalendarDateTimeRange.Value = zod_1.z.object({
            date: zod_1.z.iso.date().optional(),
            startTime: zod_1.z.union([zod_1.z.literal(""), zod_1.z.iso.time()]),
            endTime: zod_1.z.union([zod_1.z.literal(""), zod_1.z.iso.time()]),
        });
        CalendarDateTimeRange.Schema = Field.Base.extend({
            variant: configLiteral("CalendarDateTimeRange"),
            initialValue: CalendarDateTimeRange.Value,
            placeholder: zod_1.z.string().optional(),
        });
    })(CalendarDateTimeRange = Field.CalendarDateTimeRange || (Field.CalendarDateTimeRange = {}));
    Field.Schema = zod_1.z.discriminatedUnion("variant", [
        Field.Integer,
        Field.Float,
        Field.String,
        Field.UniqueString,
        Field.Password,
        Field.Secret,
        Field.Boolean,
        Field.MultiOption,
        Field.File,
        Field.Script,
        Field.Json,
        Field.List,
        Condition.Schema,
        CaseList.Schema,
        Field.Variadic,
        ResourceLoader.Schema,
        CalendarRange.Schema,
        CalendarDateTimeRange.Schema,
    ]);
    /**
     * Whether a field's stored value is airlock source rather than a literal.
     *
     * Three inputs, in precedence order: the Expression variant is always source; otherwise the
     * user's per-node choice wins if they made one (`Workflow.Data.fieldExpressions[nodeId][fieldId]`,
     * passed in as `override`); otherwise the blueprint's declared starting mode.
     *
     * `override` is deliberately a plain boolean rather than the whole workflow data — Data imports
     * Field, so reaching the other way would cycle.
     */
    function usesExpression(field, override) {
        // `only` is a hard constraint from the blueprint author and outranks the user's choice —
        // checked first so a stale override from an older workflow can't contradict it.
        if ("only" in field && field.only)
            return field.only === "expression";
        if (typeof override === "boolean")
            return override;
        return "isExpressionInitially" in field && field.isExpressionInitially === true;
    }
    Field.usesExpression = usesExpression;
})(Field || (exports.Field = Field = {}));
