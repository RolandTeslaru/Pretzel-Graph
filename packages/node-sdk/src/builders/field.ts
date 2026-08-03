import { Foundations } from "@pretzel-graph/shared/domain";
import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";

export type OmitId<T> = Omit<T, "id">


export namespace FieldBuilder {

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


    export const buildBase = <T_Id extends string>(
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
            reconcile:   false,   // set true only via FieldBuilder.reconciling(...)
            hidden:      options.hidden,
            ...buildItemScoped(options.itemScoped),
        } satisfies { id: T_Id & Field.Id } & OmitId<Field.Base>
    }

    /** Only include `isExpression` in the built field when explicitly true — keeps it out of serialization otherwise. */
    const buildIsExpression = (isExpression?: boolean) =>
        isExpression ? { isExpression: true as const } : {}

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
     * @example FieldBuilder.itemScoped(FieldBuilder.Boolean("condition", "Condition", { isExpression: true }))
     */
    export function itemScoped<F extends { id: string }>(field: F): F & { itemScoped: true } {
        return { ...field, itemScoped: true };
    }

    /**
     * Marks a field as a reconcile trigger: changing it re-runs the node's reconciler, and its value
     * is part of the reconciled identity. Carries the `reconcile: true` literal so
     * InferReconcilingFieldValues can expose it — the reconciler may only read reconcile fields.
     *
     * @example FieldBuilder.reconciling(FieldBuilder.MultiOption("operation", "Operation", { ... }))
     */
    export function reconciling<F extends { id: string }>(field: F): F & { reconcile: true } {
        return { ...field, reconcile: true };
    }




    export function UniqueString<T_Id extends string, T_Required extends boolean = false, const T_ItemScoped extends boolean = false>(
        id:          T_Id,
        displayName: string,
        options:     { prefix?: string; length?: number; placeholder?: string; isExpression?: boolean; } & BaseOptions<T_Required, T_ItemScoped> = {},
    ): T_Return<T_Id, "UniqueString", Field.UniqueString, T_Required> & ItemScopedFlag<T_ItemScoped> {
        return {
            ...buildBase(id, displayName, options),
            variant: "UniqueString",
            placeholder: options.placeholder ?? "",
            prefix: options.prefix,
            length: options.length,
            // Placeholder; real value is generated per-node at create time.
            initialValue: "",
            ...buildIsExpression(options.isExpression),
        } as T_Return<T_Id, "UniqueString", Field.UniqueString, T_Required> & ItemScopedFlag<T_ItemScoped>;
    }

    export function String<T_Id extends string, T_Required extends boolean = false, const T_ItemScoped extends boolean = false>(
        id:          T_Id,
        displayName: string,
        options: {
            initialValue?: string;
            multiline?: boolean;
            placeholder?: string;
            isExpression?: boolean;
        } & BaseOptions<T_Required, T_ItemScoped> = {},
    ): T_Return<T_Id, "String", Field.String, T_Required> & ItemScopedFlag<T_ItemScoped> {
        return {
            ...buildBase(id, displayName, options),
            variant: "String",
            placeholder: options.placeholder ?? "",
            initialValue: options.initialValue ?? "",
            multiline: options.multiline ?? false,
            ...buildIsExpression(options.isExpression),
        } as T_Return<T_Id, "String", Field.String, T_Required> & ItemScopedFlag<T_ItemScoped>;
    }




    export function Integer<T_Id extends string, T_Required extends boolean = false, const T_ItemScoped extends boolean = false>(
        id: T_Id, displayName: string, options: {
        initialValue?: number;
        min?: number;
        max?: number;
        step?: number;
        slider?: boolean;
        isExpression?: boolean;
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
            ...buildIsExpression(options.isExpression),
        } as T_Return<T_Id, "Integer", Field.Integer, T_Required> & ItemScopedFlag<T_ItemScoped>;
    }




    export function Float<T_Id extends string, T_Required extends boolean = false, const T_ItemScoped extends boolean = false>(
        id: T_Id, displayName: string, options: {
        initialValue?: number;
        min?: number;
        max?: number;
        step?: number;
        slider?: boolean;
        isExpression?: boolean;
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
            ...buildIsExpression(options.isExpression),
        } as T_Return<T_Id, "Float", Field.Float, T_Required> & ItemScopedFlag<T_ItemScoped>;
    }



    export function Boolean<T_Id extends string, T_Required extends boolean = false, const T_ItemScoped extends boolean = false>(
        id: T_Id, displayName: string, options: {
        initialValue?: boolean;
        isExpression?: boolean;
    } & BaseOptions<T_Required, T_ItemScoped> = {},
    ): T_Return<T_Id, "Boolean", Field.Boolean, T_Required> & ItemScopedFlag<T_ItemScoped> {
        return {
            ...buildBase(id, displayName, options),
            variant: "Boolean",
            initialValue: options.initialValue ?? false,
            ...buildIsExpression(options.isExpression),
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
        isExpression?: boolean;
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
            ...buildIsExpression(options.isExpression),
        } as unknown as T_Return<T_Id, "MultiOption", Field.MultiOption, T_Required> & ItemScopedFlag<T_ItemScoped> & {
            initialValue: TOptions[number]["value"];
            options: TOptions;
        };
    }



    export function File<T_Id extends string, T_Required extends boolean = false, const T_ItemScoped extends boolean = false>(
        id: T_Id, displayName: string, options: {
        initialValue?: string;
        fileTypes?: string[];
        isExpression?: boolean;
    } & BaseOptions<T_Required, T_ItemScoped> = {},
    ): T_Return<T_Id, "File", Field.File, T_Required> & ItemScopedFlag<T_ItemScoped> {
        return {
            ...buildBase(id, displayName, options),
            variant: "File",
            initialValue: options.initialValue ?? "",
            fileTypes: options.fileTypes,
            ...buildIsExpression(options.isExpression),
        } as T_Return<T_Id, "File", Field.File, T_Required> & ItemScopedFlag<T_ItemScoped>;
    }



    export function List<T_Id extends string, T_Required extends boolean = false, const T_ItemScoped extends boolean = false>(
        id: T_Id, displayName: string, options: {
        initialValue?: string[];
        isExpression?: boolean;
    } & BaseOptions<T_Required, T_ItemScoped> = {},
    ): T_Return<T_Id, "List", Field.List, T_Required> & ItemScopedFlag<T_ItemScoped> {
        return {
            ...buildBase(id, displayName, options),
            variant: "List",
            initialValue: options.initialValue ?? [],
            ...buildIsExpression(options.isExpression),
        } as T_Return<T_Id, "List", Field.List, T_Required> & ItemScopedFlag<T_ItemScoped>;
    }



    export function Json<T_Id extends string, T_Required extends boolean = false, const T_ItemScoped extends boolean = false>(
        id: T_Id, displayName: string, options: {
        initialValue?: any;
        isExpression?: boolean;
    } & BaseOptions<T_Required, T_ItemScoped> = {},
    ): T_Return<T_Id, "Json", Field.Json, T_Required> & ItemScopedFlag<T_ItemScoped> {
        return {
            ...buildBase(id, displayName, options),
            variant: "Json",
            initialValue: options.initialValue ?? {},
            ...buildIsExpression(options.isExpression),
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
        isExpression?: boolean;
    } & BaseOptions<T_Required, T_ItemScoped> = {},
    ): T_Return<T_Id, "Secret", Field.Secret, T_Required> & ItemScopedFlag<T_ItemScoped> {
        return {
            ...buildBase(id, displayName, options),
            variant: "Secret",
            initialValue: options.initialValue ?? "",
            ...buildIsExpression(options.isExpression),
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
        id: T_Id, displayName: string, options: { groupId: string } & BaseOptions,
    ): T_Return<T_Id, "Variadic", Field.Variadic, false> {
        return {
            ...buildBase(id, displayName, options),
            variant: "Variadic",
            initialValue: [],
            groupId: options.groupId as Field.Variadic["groupId"],
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



    // Framework-owned fields appended to every blueprint by defineBlueprint. They are also
    // passed to the shape compiler as ambient fields, so a blueprint can branch on one
    // ("isConvertedToTool=true") without declaring it.
    export namespace DEFAULTS {
        export const toolConvertedField = FieldBuilder.reconciling(FieldBuilder.Boolean(
            "isConvertedToTool",
            "Tool Mode",
            {
            hidden:       true,
            initialValue: false,
            },
        ));

        export const signalDependencyStrategyField = FieldBuilder.MultiOption(
            "signalDependency",
            "Signal Dependency",
            {
            options: [
                { value: "AND", displayName: "(AND) All signals required",        description: "Fire only once every upstream signal has arrived." },
                { value: "OR",  displayName: "(OR) At least one signal required", description: "Fire as soon as any upstream signal arrives (re-fires on each — enables cycles)." },
                { value: "XOR", displayName: "(XOR) Exactly one signal required", description: "Fire on exactly one signal. If two or more arrive at once, the run fails with a collision error." },
            ],
            initialValue: "OR",
            tooltip:      "Determines how incoming signals are evaluated to trigger node execution.",
            },
        );

        export const dataDependencyStrategyField = FieldBuilder.MultiOption(
            "dataDependency",
            "Data Dependency",
            {
            options: [
                { value: "AND", displayName: "Wait & Join",    description: "Wait until every wired input port has resolved, then read all of them." },
                { value: "OR",  displayName: "Follow Trigger", description: "Don't wait — read only the input port(s) that propagated the triggering signal." },
            ],
            initialValue: "AND",
            tooltip:      "Controls how the node gathers its inputs once it's been triggered: wait for all wired ports, or read only the ones that fired.",
            },
        );

        export const onErrorStrategyField = FieldBuilder.MultiOption(
            "onErrorStrategy",
            "On Error",
            {
            options: [
                { value: "terminate",  displayName: "Terminate workflow", description: "Fail the whole run." },
                { value: "propagate",  displayName: "Propagate error",    description: "Forward the error along outgoing edges." },
                { value: "do_nothing", displayName: "Do nothing",         description: "Swallow the error — no signal, no termination. Downstream stalls." },
            ],
            initialValue: "propagate",
            tooltip:      "What happens when this node's execution throws.",
            },
        );


        export const StandardNode = [
            signalDependencyStrategyField,
            dataDependencyStrategyField,
            onErrorStrategyField,
        ] as const;

        export const TOOL_FIELDS = [toolConvertedField] as const;

        // `field.id as string`, not String(...) — inside this namespace `String` is
        // FieldBuilder.String, the builder, not the global.
        export const IDS: ReadonlySet<string> = new Set(
            [...StandardNode, ...TOOL_FIELDS].map(field => field.id as string),
        );

        // Return type stays precise — the shape compiler infers ambient field value types from it.
        // Tupled so anything that isn't literally `true` (a widened boolean, undefined) takes
        // the non-tool set.
        export function forBlueprint<const T_ToolCompatible extends boolean | undefined>(
            toolCompatible: T_ToolCompatible,
        ): [T_ToolCompatible] extends [true]
            ? readonly [...typeof StandardNode, ...typeof TOOL_FIELDS]
            : typeof StandardNode {

            return (toolCompatible ? [...StandardNode, ...TOOL_FIELDS] : StandardNode) as any;
        }
    }


}
