import { Foundations } from "@pretzel-graph/shared/domain";
import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import type { Port } from "@pretzel-graph/shared/domain/Foundations/Port";

export type OmitId<T> = Omit<T, "id">


export namespace defineField {

    /** When T_ItemScoped is the literal `true`, carry `{ itemScoped: true }` so InferItemFields picks it up. */
    export type ItemScopedFlag<T_ItemScoped extends boolean> = T_ItemScoped extends true ? { itemScoped: true } : {};

    export type BaseOptions<T_Required extends boolean = false, T_ItemScoped extends boolean = false> = {
        required?:   T_Required;
        advanced?:   boolean;
        hidden?:     boolean;
        tooltip?:    string;
        itemScoped?: T_ItemScoped;
    }

    /** Shorthand: return type for every builder */
    type T_Return<T_Id extends string, T_Variant extends Field.Variant, T_Field extends Field, T_Required extends boolean> = {
        id:                    T_Id & Field.Id;
        readonly __literalId?: T_Id;
        readonly __variant?:   T_Variant;
        readonly __required?:  T_Required;
    } & Omit<T_Field, "id">


    const buildBase = <T_Id extends string>(
        id:          T_Id,
        displayName: string,
        options:     BaseOptions<boolean, boolean>,
    ) => {
        return {
            id:          id as T_Id & Field.Id,
            displayName,
            tooltip:     options.tooltip,
            required:    options.required ?? false,
            advanced:    options.advanced ?? false,
            reconcile:   false,   // derivative compilation stamps condition fields true
            hidden:      options.hidden,
            ...buildItemScoped(options.itemScoped),
        } satisfies { id: T_Id & Field.Id } & OmitId<Field.Base>
    }

    /** Only include `isExpressionInitially` in the built field when explicitly true — keeps it out of serialization otherwise. */
    const buildIsExpression = (isExpressionInitially?: boolean) =>
        isExpressionInitially ? { isExpressionInitially: true as const } : {}

    /**
     * Locks a field to one mode, removing the editor's Static/Expression toggle.
     *
     *   "expression" — a literal would make the node meaningless (a router that can't branch,
     *                  a filter that can't see $item). Coercion still comes from the variant.
     *   "static"     — the value decides the graph's *shape* (derivative discriminants,
     *                  exposed-port config), resolved before any airlock exists to evaluate it.
     */
    const buildOnly = (only?: "static" | "expression") =>
        only ? { only } : {}

    /** Only include `itemScoped` when explicitly true — keeps it out of serialization otherwise. */
    const buildItemScoped = (itemScoped?: boolean) =>
        itemScoped ? { itemScoped: true as const } : {}

    /**
     * Marks a field as item-scoped: the engine skips it during eager field evaluation, and the
     * node resolves it per-element via RuntimeNode.evalItemField with $item bound. Excluded from
     * `this.fieldValues` (InferFieldValues) and surfaced in `evalItemField`'s key set (InferItemFields).
     *
     * Prefer the inline `itemScoped: true` option. This wrapper is useful when composing fields.
     *
     * @example defineField.itemScoped(defineField.Boolean("condition", "Condition", { isExpressionInitially: true }))
     */
    export function itemScoped<F extends { id: string }>(field: F): F & { itemScoped: true } {
        return { ...field, itemScoped: true };
    }

    export function UniqueString<T_Id extends string, T_Required extends boolean = false, const T_ItemScoped extends boolean = false>(
        id:          T_Id,
        displayName: string,
        options:     { prefix?: string; length?: number; placeholder?: string; isExpressionInitially?: boolean; only?: "static" | "expression"; } & BaseOptions<T_Required, T_ItemScoped> = {},
    ): T_Return<T_Id, "UniqueString", Field.UniqueString, T_Required> & ItemScopedFlag<T_ItemScoped> {
        return {
            ...buildBase(id, displayName, options),
            variant: "UniqueString",
            placeholder: options.placeholder ?? "",
            prefix: options.prefix,
            length: options.length,
            // Placeholder; real value is generated per-node at create time.
            initialValue: "",
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        } as T_Return<T_Id, "UniqueString", Field.UniqueString, T_Required> & ItemScopedFlag<T_ItemScoped>;
    }

    export function String<T_Id extends string, T_Required extends boolean = false, const T_ItemScoped extends boolean = false>(
        id:          T_Id,
        displayName: string,
        options: {
            initialValue?: string;
            multiline?: boolean;
            placeholder?: string;
            isExpressionInitially?: boolean; only?: "static" | "expression";
        } & BaseOptions<T_Required, T_ItemScoped> = {},
    ): T_Return<T_Id, "String", Field.String, T_Required> & ItemScopedFlag<T_ItemScoped> {
        return {
            ...buildBase(id, displayName, options),
            variant: "String",
            placeholder: options.placeholder ?? "",
            initialValue: options.initialValue ?? "",
            multiline: options.multiline ?? false,
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        } as T_Return<T_Id, "String", Field.String, T_Required> & ItemScopedFlag<T_ItemScoped>;
    }




    export function Integer<T_Id extends string, T_Required extends boolean = false, const T_ItemScoped extends boolean = false>(
        id: T_Id, displayName: string, options: {
        initialValue?: number;
        min?: number;
        max?: number;
        step?: number;
        slider?: boolean;
        isExpressionInitially?: boolean; only?: "static" | "expression";
    } & BaseOptions<T_Required, T_ItemScoped> = {},
    ): T_Return<T_Id, "Integer", Field.Integer, T_Required> & ItemScopedFlag<T_ItemScoped> {
        return {
            ...buildBase(id, displayName, options),
            variant: "Integer",
            initialValue: options.initialValue,
            min: options.min,
            max: options.max,
            step: options.step ?? 1,
            slider: options.slider,
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        } as T_Return<T_Id, "Integer", Field.Integer, T_Required> & ItemScopedFlag<T_ItemScoped>;
    }




    export function Float<T_Id extends string, T_Required extends boolean = false, const T_ItemScoped extends boolean = false>(
        id: T_Id, displayName: string, options: {
        initialValue?: number;
        min?: number;
        max?: number;
        step?: number;
        slider?: boolean;
        isExpressionInitially?: boolean; only?: "static" | "expression";
    } & BaseOptions<T_Required, T_ItemScoped> = {},
    ): T_Return<T_Id, "Float", Field.Float, T_Required> & ItemScopedFlag<T_ItemScoped> {
        return {
            ...buildBase(id, displayName, options),
            variant: "Float",
            initialValue: options.initialValue ?? 0.0,
            min: options.min,
            max: options.max,
            step: options.step ?? 0.1,
            slider: options.slider,
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        } as T_Return<T_Id, "Float", Field.Float, T_Required> & ItemScopedFlag<T_ItemScoped>;
    }



    export function Boolean<T_Id extends string, T_Required extends boolean = false, const T_ItemScoped extends boolean = false>(
        id: T_Id, displayName: string, options: {
        initialValue?: boolean;
        isExpressionInitially?: boolean; only?: "static" | "expression";
    } & BaseOptions<T_Required, T_ItemScoped> = {},
    ): T_Return<T_Id, "Boolean", Field.Boolean, T_Required> & ItemScopedFlag<T_ItemScoped> {
        return {
            ...buildBase(id, displayName, options),
            variant: "Boolean",
            initialValue: options.initialValue ?? false,
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        } as T_Return<T_Id, "Boolean", Field.Boolean, T_Required> & ItemScopedFlag<T_ItemScoped>;
    }



    export type MultiOptionItem<V extends string = string> = {
        value: V;
        displayName?: string;
        description?: string;
    }

    export function MultiOption<
        T_Id extends string,
        T_Required extends boolean = false,
        const T_ItemScoped extends boolean = false,
        const TOptions extends readonly MultiOptionItem[] = readonly MultiOptionItem[]
    >(
        id: T_Id,
        displayName: string,
        options: {
        initialValue: TOptions[number]["value"];
        options: TOptions;
        variant?: "select" | "tab";
        isExpressionInitially?: boolean; only?: "static" | "expression";
    } & BaseOptions<T_Required, T_ItemScoped>
    ): T_Return<T_Id, "MultiOption", Field.MultiOption, T_Required> & ItemScopedFlag<T_ItemScoped> & {
        initialValue: TOptions[number]["value"];
        options: TOptions;
    } {
        return {
            ...buildBase(id, displayName, options),
            variant: "MultiOption",
            initialValue: options.initialValue,
            options: options.options as unknown as Field.MultiOption["options"],
            kind: options.variant ?? "select",
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        } as unknown as T_Return<T_Id, "MultiOption", Field.MultiOption, T_Required> & ItemScopedFlag<T_ItemScoped> & {
            initialValue: TOptions[number]["value"];
            options: TOptions;
        };
    }



    export function File<T_Id extends string, T_Required extends boolean = false, const T_ItemScoped extends boolean = false>(
        id: T_Id, displayName: string, options: {
        initialValue?: string;
        fileTypes?: string[];
        isExpressionInitially?: boolean; only?: "static" | "expression";
    } & BaseOptions<T_Required, T_ItemScoped> = {},
    ): T_Return<T_Id, "File", Field.File, T_Required> & ItemScopedFlag<T_ItemScoped> {
        return {
            ...buildBase(id, displayName, options),
            variant: "File",
            initialValue: options.initialValue ?? "",
            fileTypes: options.fileTypes,
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        } as T_Return<T_Id, "File", Field.File, T_Required> & ItemScopedFlag<T_ItemScoped>;
    }



    export function List<T_Id extends string, T_Required extends boolean = false, const T_ItemScoped extends boolean = false>(
        id: T_Id, displayName: string, options: {
        initialValue?: string[];
        isExpressionInitially?: boolean; only?: "static" | "expression";
    } & BaseOptions<T_Required, T_ItemScoped> = {},
    ): T_Return<T_Id, "List", Field.List, T_Required> & ItemScopedFlag<T_ItemScoped> {
        return {
            ...buildBase(id, displayName, options),
            variant: "List",
            initialValue: options.initialValue ?? [],
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        } as T_Return<T_Id, "List", Field.List, T_Required> & ItemScopedFlag<T_ItemScoped>;
    }



    export function Json<T_Id extends string, T_Required extends boolean = false, const T_ItemScoped extends boolean = false>(
        id: T_Id, displayName: string, options: {
        initialValue?: any;
        isExpressionInitially?: boolean; only?: "static" | "expression";
    } & BaseOptions<T_Required, T_ItemScoped> = {},
    ): T_Return<T_Id, "Json", Field.Json, T_Required> & ItemScopedFlag<T_ItemScoped> {
        return {
            ...buildBase(id, displayName, options),
            variant: "Json",
            initialValue: options.initialValue ?? {},
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        } as T_Return<T_Id, "Json", Field.Json, T_Required> & ItemScopedFlag<T_ItemScoped>;
    }



    export function Password<T_Id extends string, T_Required extends boolean = false>(
        id: T_Id, displayName: string, options: {
        placeholder?: string;
    } & BaseOptions<T_Required> = {},
    ): T_Return<T_Id, "Password", Field.Password, T_Required> {
        return {
            ...buildBase(id, displayName, options),
            variant: "Password",
            initialValue: "",
            placeholder: options.placeholder,
        };
    }

    export function Secret<T_Id extends string, T_Required extends boolean = false, const T_ItemScoped extends boolean = false>(
        id: T_Id, displayName: string, options: {
        initialValue?: string;
        isExpressionInitially?: boolean; only?: "static" | "expression";
    } & BaseOptions<T_Required, T_ItemScoped> = {},
    ): T_Return<T_Id, "Secret", Field.Secret, T_Required> & ItemScopedFlag<T_ItemScoped> {
        return {
            ...buildBase(id, displayName, options),
            variant: "Secret",
            initialValue: options.initialValue ?? "",
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        } as T_Return<T_Id, "Secret", Field.Secret, T_Required> & ItemScopedFlag<T_ItemScoped>;
    }



    export function Script<T_Id extends string, T_Required extends boolean = false>(
        id: T_Id, displayName: string, options: {
        initialValue?: string;
    } & BaseOptions<T_Required> = {},
    ): T_Return<T_Id, "Script", Field.Script, T_Required> {
        return {
            ...buildBase(id, displayName, options),
            variant: "Script",
            initialValue: options.initialValue ?? "",
        };
    }

    export function CaseList<T_Id extends string, T_Required extends boolean = false>(
        id: T_Id, displayName: string, options: {
            initialValue?: Field.CaseList.Value
        } & BaseOptions<T_Required> = {},
    ): T_Return<T_Id, "CaseList", Field.CaseList, T_Required> {
        return {
            ...buildBase(id, displayName, options),
            variant: "CaseList",
            initialValue: options.initialValue ?? [],
        };
    }



    export function Variadic<T_Id extends string>(
        id: T_Id, displayName: string, options: {
            initialValue: number;
            min?:         number;
            max?:         number;
            startIndex?:  number;
            inputs?:      readonly Port.Input[];
            outputs?:     readonly Port.Output[];
        } & BaseOptions,
    ): T_Return<T_Id, "Variadic", Field.Variadic, false> {
        return {
            ...buildBase(id, displayName, options),
            variant:      "Variadic",
            reconcile:    true,
            initialValue: options.initialValue,
            min:          options.min,
            max:          options.max,
            startIndex:   options.startIndex,
            template:     { inputs: [...(options.inputs ?? [])], outputs: [...(options.outputs ?? [])] },
        };
    }

    export function Condition<T_Id extends string, T_Required extends boolean = false>(
        id: T_Id, displayName: string, options: {
        initialValue?: Field.Condition.Value;
    } & BaseOptions<T_Required> = {},
    ): T_Return<T_Id, "Condition", Field.Condition, T_Required> {
        const rootId = "root" as Field.Condition.RuleGroup.Id;
        return {
            ...buildBase(id, displayName, options),
            variant: "Condition",
            initialValue: options.initialValue ?? {
                rootId,
                rules: {
                    "rule1": { id: "rule1", dataType: "string", leftOperand: "", operator: "equals", rightOperand: "" }
                } as Record<Field.Condition.Rule.Id, Field.Condition.Rule>,
                groups: {
                    [rootId]: { id: rootId, combinator: "AND", children: ["rule1"] },
                } as Record<Field.Condition.RuleGroup.Id, Field.Condition.RuleGroup>,
            },
        };
    }

    export function ResourceLoader<T_Id extends string, T_Required extends boolean = false>(
        id: T_Id, displayName: string, options: {
        loaderId: string;
        dependsOn?: string[];
        placeholder?: string;
        initialValue?: Field.ResourceLoader.Value;
    } & BaseOptions<T_Required>
    ): T_Return<T_Id, "ResourceLoader", Field.ResourceLoader, T_Required> {
        return {
            ...buildBase(id, displayName, options),
            variant: "ResourceLoader",
            loaderId: options.loaderId as Field.ResourceLoader.LoaderId,
            dependsOn: (options.dependsOn ?? []) as Field.Id[],
            placeholder: options.placeholder ?? "",
            initialValue: options.initialValue ?? { mode: "list", value: "" },
        };
    }

    export function CalendarRange<T_Id extends string, T_Required extends boolean = false>(
        id: T_Id, displayName: string, options: {
        initialValue?: Field.CalendarRange.Value;
        placeholder?: string;
        maxDate?: string;
    } & BaseOptions<T_Required> = {},
    ): T_Return<T_Id, "CalendarRange", Field.CalendarRange, T_Required> {
        return {
            ...buildBase(id, displayName, options),
            variant:      "CalendarRange",
            initialValue: options.initialValue ?? {},
            placeholder:  options.placeholder,
            maxDate:      options.maxDate,
        };
    }

    export function CalendarDateTimeRange<T_Id extends string, T_Required extends boolean = false>(
        id: T_Id, displayName: string, options: {
        initialValue?: Field.CalendarDateTimeRange.Value;
        placeholder?: string;
    } & BaseOptions<T_Required> = {},
    ): T_Return<T_Id, "CalendarDateTimeRange", Field.CalendarDateTimeRange, T_Required> {
        return {
            ...buildBase(id, displayName, options),
            variant:      "CalendarDateTimeRange",
            initialValue: options.initialValue ?? { startTime: "", endTime: "" },
            placeholder:  options.placeholder,
        };
    }

    /** Picks a workflow from the library and stores its id. Does not attach it as a dependency. */
    export function WorkflowIdSelector<T_Id extends string, T_Required extends boolean = false>(
        id: T_Id, displayName: string, options: {
        initialValue?: string;
        placeholder?: string;
        isExpressionInitially?: boolean;
        only?: "static" | "expression";
    } & BaseOptions<T_Required> = {},
    ): T_Return<T_Id, "WorkflowIdSelector", Field.WorkflowIdSelector, T_Required> {
        return {
            ...buildBase(id, displayName, options),
            variant:      "WorkflowIdSelector",
            initialValue: options.initialValue ?? "",
            placeholder:  options.placeholder,
            ...buildIsExpression(options.isExpressionInitially),
            ...buildOnly(options.only),
        };
    }
}
