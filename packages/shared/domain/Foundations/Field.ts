import { z } from "zod"
import { evaluateRule as _evaluateRule, evaluateRuleGroup as _evaluateRuleGroup, evaluateCondition as _evaluateCondition } from "../../utils";

export namespace Field {
    export const Id = z.string().brand("FieldId");
    export type Id = z.infer<typeof Id>;

    export const Value = z.any();
    export type Value = z.infer<typeof Value>

    export const Base = z.object({
        id: Field.Id,
        advanced: z.boolean(),
        required: z.boolean(),
        reconcile: z.boolean(),
        hidden: z.boolean().optional(),

        displayName: z.string(),
        description: z.string().optional(),
        tooltip: z.string().optional(),
        groupId: z.string().brand("GroupId").optional(),
    })
    export type Base = z.infer<typeof Base>

    export const Variant = z.enum([
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
    ])
    export type Variant = z.infer<typeof Variant>

    function configLiteral<T extends Field.Variant>(value: T) {
        return z.literal(value);
    }

    export const Integer = Field.Base.extend({
        variant: configLiteral("Integer"),
        initialValue: z.int().optional(),
        min: z.int().optional(),
        max: z.int().optional(),
        step: z.int().optional(),
        slider: z.boolean().optional(),
    })

    export const Float = Field.Base.extend({
        variant: configLiteral("Float"),
        initialValue: z.number(),
        min: z.number().optional(),
        max: z.number().optional(),
        step: z.number().optional(),
        slider: z.boolean().optional(),
    })

    export const String = Field.Base.extend({
        variant: configLiteral("String"),
        initialValue: z.string(),
        multiline: z.boolean(),
        placeholder: z.string().optional(),
        isExpression: z.boolean().optional(),
    })

    export const UniqueString = Field.Base.extend({
        variant: configLiteral("UniqueString"),
        initialValue: z.string(),
        isExpression: z.boolean().optional(),
        prefix: z.string().optional(),
        length: z.number().optional(),
        placeholder: z.string().optional(),
    })

    export const Password = Field.Base.extend({
        variant: configLiteral("Password"),
        initialValue: z.string(),
        placeholder: z.string().optional(),
    })

    export const Secret = Field.Base.extend({
        variant: configLiteral("Secret"),
        initialValue: z.string(),
    })

    export const Boolean = Field.Base.extend({
        variant: configLiteral("Boolean"),
        initialValue: z.boolean(),
    })

    export const MultiOption = Field.Base.extend({
        variant: configLiteral("MultiOption"),
        initialValue: z.string(),
        placeholder: z.string().optional(),
        options: z.array(
            z.object({
                value: z.string(),
                displayName: z.string().optional(),
            })
        ),
        kind: z.enum(["select", "tab"]).default("select"),
    })

    export const File = Field.Base.extend({
        variant: configLiteral("File"),
        initialValue: z.string(),
        fileTypes: z.array(z.string()).optional(),
    })

    export const Script = Field.Base.extend({
        variant: configLiteral("Script"),
        initialValue: z.string(),
    })

    export const Json = Field.Base.extend({
        variant: configLiteral("Json"),
        initialValue: z.json(),
    })

    export const List = Field.Base.extend({
        variant: configLiteral("List"),
        initialValue: z.array(z.string()),
    })

    export const Variadic = Field.Base.extend({
        variant: configLiteral("Variadic"),
        initialValue: z.array(z.string()),
        groupId: z.string().brand("GroupId"),
    })

    export namespace Condition {

        export const DataType = z.enum(["string", "number", "dateTime", "boolean", "array", "object"])
        export type DataType = z.infer<typeof DataType>

        export namespace Operator {
            export const shared = ["exists", "not_exists", "is_empty", "is_not_empty"] as const

            export const String = z.enum([
                ...shared,
                "equals", "not_equals",
                "contains", "not_contains",
                "starts_with", "not_starts_with",
                "ends_with", "not_ends_with",
                "matches_regex", "not_matches_regex",
            ])

            export const Number = z.enum([
                ...shared,
                "equals", "not_equals",
                "greater_than", "less_than",
                "greater_than_or_equal", "less_than_or_equal",
            ])

            export const DateTime = z.enum([
                ...shared,
                "equals", "not_equals",
                "after", "before",
                "after_or_equal", "before_or_equal",
            ])

            export const Boolean = z.enum([
                ...shared,
                "is_true", "is_false",
                "equals", "not_equals",
            ])

            export const Array = z.enum([
                ...shared,
                "contains", "not_contains",
                "length_equals", "length_not_equals",
                "length_greater_than", "length_less_than",
                "length_greater_than_or_equal", "length_less_than_or_equal",
            ])

            export const Object = z.enum([
                ...shared,
            ])

            export type String = z.infer<typeof String>
            export type Number = z.infer<typeof Number>
            export type DateTime = z.infer<typeof DateTime>
            export type Boolean = z.infer<typeof Boolean>
            export type Array = z.infer<typeof Array>
            export type Object = z.infer<typeof Object>

            export const Unary = z.enum([
                ...shared,
                "is_true", "is_false",
            ])
            export type Unary = z.infer<typeof Unary>

            export const Schema = z.union([String, Number, DateTime, Boolean, Array, Object])

            export const MAP = {
                string: String,
                number: Number,
                dateTime: DateTime,
                boolean: Boolean,
                array: Array,
                object: Object,
            } as const satisfies Record<Condition.DataType, z.ZodEnum<any>>
        }
        export type Operator = z.infer<typeof Operator.Schema>


        export namespace Rule {
            export const Id = z.string().brand("RuleId")
            export type Id = z.infer<typeof Id>
            export const createId = (id?: string) => Id.parse( id || crypto.randomUUID())

            const Base = z.object({
                id: Id,
                leftOperand: z.string(),
                rightOperand: z.string().optional(),
            })

            export const String   = Base.extend({ dataType: z.literal("string"),   operator: Operator.String })
            export const Number   = Base.extend({ dataType: z.literal("number"),   operator: Operator.Number })
            export const DateTime = Base.extend({ dataType: z.literal("dateTime"), operator: Operator.DateTime })
            export const Boolean  = Base.extend({ dataType: z.literal("boolean"),  operator: Operator.Boolean })
            export const Array    = Base.extend({ dataType: z.literal("array"),    operator: Operator.Array })
            export const Object   = Base.extend({ dataType: z.literal("object"),   operator: Operator.Object })

            export type String   = z.infer<typeof String>
            export type Number   = z.infer<typeof Number>
            export type DateTime = z.infer<typeof DateTime>
            export type Boolean  = z.infer<typeof Boolean>
            export type Array    = z.infer<typeof Array>
            export type Object   = z.infer<typeof Object>

            export const Schema = z.discriminatedUnion("dataType", [
                String, Number, DateTime, Boolean, Array, Object,
            ])
        }
        export type Rule = z.infer<typeof Rule.Schema>

        export namespace RuleGroup {
            export const Id = z.string().brand("RuleGroupId")
            export type Id = z.infer<typeof Id>
            export const createId = (id?: string) => Id.parse( id || crypto.randomUUID())

            export const Schema = z.object({
                id: Id,
                combinator: z.enum(["AND", "OR"]),
                children: z.array(z.union([Rule.Id, RuleGroup.Id])),
            })
        }
        export type RuleGroup = z.infer<typeof RuleGroup.Schema>

        export const Value = z.object({
            rootId: RuleGroup.Id,
            rules: z.record(Rule.Id, Rule.Schema),
            groups: z.record(RuleGroup.Id, RuleGroup.Schema),
        })
        export type Value = z.infer<typeof Value>

        export const Schema = Field.Base.extend({
            variant: configLiteral("Condition"),
            initialValue: Value,
        });


        export const evaluateRule = _evaluateRule;
        export const evaluateRuleGroup = _evaluateRuleGroup;
        export const evaluate = _evaluateCondition;
    }

    export namespace CaseList {
        export const Entry = z.object({
            portId: z.string().brand("PortId").brand("OutputId"),
            label: z.string(),
            condition: Condition.Value,
        });
        export type Entry = z.infer<typeof Entry>;

        export const Value = z.array(Entry);
        export type Value = z.infer<typeof Value>;

        export const Schema = Field.Base.extend({
            variant: configLiteral("CaseList"),
            initialValue: Value,
        });

        export const createEntry = (portId: string, label: string): Entry => {
            const rootId = Condition.RuleGroup.createId("root");
            return {
                portId: portId as Entry["portId"],
                label,
                condition: {
                    rootId,
                    rules: {
                        [Condition.Rule.createId("rule1")]: {
                            id: Condition.Rule.createId("rule1"),
                            dataType: "string",
                            leftOperand: "",
                            operator: "equals",
                            rightOperand: "",
                        },
                    } as Condition.Value["rules"],
                    groups: {
                        [rootId]: { id: rootId, combinator: "AND", children: [Condition.Rule.createId("rule1")] },
                    } as Condition.Value["groups"],
                },
            };
        };
    }

    export interface Integer extends z.infer<typeof Integer> { }
    export interface Float extends z.infer<typeof Float> { }
    export interface String extends z.infer<typeof String> { }
    export interface UniqueString extends z.infer<typeof UniqueString> { }
    export interface Password extends z.infer<typeof Password> { }
    export interface Secret extends z.infer<typeof Secret> { }
    export interface Boolean extends z.infer<typeof Boolean> { }
    export interface MultiOption extends z.infer<typeof MultiOption> { }
    export interface File extends z.infer<typeof File> { }
    export interface Script extends z.infer<typeof Script> { }
    export interface Json extends z.infer<typeof Json> { }
    export interface List extends z.infer<typeof List> { }
    export interface Condition extends z.infer<typeof Condition.Schema> { }
    export interface CaseList extends z.infer<typeof CaseList.Schema> { }
    export interface Variadic extends z.infer<typeof Variadic> { }

    export const Schema = z.discriminatedUnion("variant", [
        Integer,
        Float,
        String,
        UniqueString,
        Password,
        Secret,
        Boolean,
        MultiOption,
        File,
        Script,
        Json,
        List,
        Condition.Schema,
        CaseList.Schema,
        Variadic,
    ]);

    export type Schema = z.infer<typeof Schema>;
}
export type Field = z.infer<typeof Field.Schema>;
