import { Foundations } from "@pretzel-graph/shared/domain";

export type LiteralField<
    T_Id extends string,
    T_Variant extends Foundations.Field.Variant,
    T_Field extends Foundations.Field,
    T_Required extends boolean = false,
    T_HasInitial extends boolean = false,
> = {
    id: T_Id & Foundations.Field.Id;
    readonly __literalId?: T_Id;
    readonly __variant?: T_Variant;
    readonly __required?: T_Required;
    readonly __hasInitialValue?: T_HasInitial;
} & Omit<T_Field, "id">

export type OmitId<T> = Omit<T, "id">


export namespace FieldBuilder {

    /** When TItem is the literal `true`, carry `{ itemScoped: true }` so InferItemFields picks it up. */
    export type ItemScopedFlag<TItem extends boolean> = TItem extends true ? { itemScoped: true } : {};

    export type BaseProps<TId extends string, TReq extends boolean = false, TItem extends boolean = false> = {
        id: TId;
        required?: TReq;
        advanced?: boolean;
        hidden?: boolean;
        displayName: string;
        tooltip?: string;
        reconcile?: boolean;
        /**
         * Marks the field item-scoped: skipped during eager field eval, resolved per-element via
         * RuntimeNode.evalItemField with $item bound. Pass the literal `true` so the type survives
         * into InferItemFields. (Equivalent to wrapping with FieldBuilder.itemScoped.)
         */
        itemScoped?: TItem;
    }

    /** Shorthand: return type for every builder */
    type Ret<TId extends string, V extends Foundations.Field.Variant, F extends Foundations.Field, TReq extends boolean, THasInit extends boolean = false> =
        LiteralField<TId, V, F, TReq, THasInit>

    export const buildBase = <TId extends string>(
        props: BaseProps<TId, boolean, boolean>
    ) => {
        return {
            id: props.id as TId & Foundations.Field.Id,
            displayName: props.displayName,
            tooltip: props.tooltip,
            required: props.required ?? false,
            advanced: props.advanced ?? false,
            reconcile: props.reconcile ?? false,
            hidden: props.hidden,
            ...buildItemScoped(props.itemScoped),
        } satisfies { id: TId & Foundations.Field.Id } & OmitId<Foundations.Field.Base>
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
     * `this.fields` (InferFields) and surfaced in `evalItemField`'s key set (InferItemFields).
     *
     * Prefer the inline `itemScoped: true` config prop; this wrapper remains for backward compat.
     *
     * @example FieldBuilder.itemScoped(FieldBuilder.Boolean({ id: "condition", isExpression: true, ... }))
     */
    export function itemScoped<F extends { id: string }>(field: F): F & { itemScoped: true } {
        return { ...field, itemScoped: true };
    }




    export function UniqueString<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(
        config: { prefix?: string; length?: number; placeholder?: string; isExpression?: boolean; } & BaseProps<TId, TReq, TItem>
    ): Ret<TId, "UniqueString", Foundations.Field.UniqueString, TReq, true> & ItemScopedFlag<TItem> {
        return {
            ...buildBase(config),
            variant: "UniqueString",
            placeholder: config.placeholder ?? "",
            prefix: config.prefix,
            length: config.length,
            // Placeholder; real value is generated per-node at create time.
            initialValue: "",
            ...buildIsExpression(config.isExpression),
        } as Ret<TId, "UniqueString", Foundations.Field.UniqueString, TReq, true> & ItemScopedFlag<TItem>;
    }

    export function String<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(
        config: { initialValue: string; multiline?: boolean; placeholder?: string; isExpression?: boolean; } & BaseProps<TId, TReq, TItem>
    ): Ret<TId, "String", Foundations.Field.String, TReq, true> & ItemScopedFlag<TItem>;
    export function String<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(
        config: { multiline?: boolean; placeholder?: string; isExpression?: boolean; } & BaseProps<TId, TReq, TItem>
    ): Ret<TId, "String", Foundations.Field.String, TReq, false> & ItemScopedFlag<TItem>;
    export function String<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(
        config: {
            initialValue?: string;
            multiline?: boolean;
            placeholder?: string;
            isExpression?: boolean;
        } & BaseProps<TId, TReq, TItem>
    ): Ret<TId, "String", Foundations.Field.String, TReq, boolean> & ItemScopedFlag<TItem> {
        return {
            ...buildBase(config),
            variant: "String",
            placeholder: config.placeholder ?? "",
            initialValue: config.initialValue ?? "",
            multiline: config.multiline ?? false,
            ...buildIsExpression(config.isExpression),
        } as Ret<TId, "String", Foundations.Field.String, TReq, boolean> & ItemScopedFlag<TItem>;
    }




    export function Integer<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(config: {
        initialValue: number; min?: number; max?: number; step?: number; slider?: boolean; isExpression?: boolean;
    } & BaseProps<TId, TReq, TItem>): Ret<TId, "Integer", Foundations.Field.Integer, TReq, true> & ItemScopedFlag<TItem>;
    export function Integer<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(config: {
        min?: number; max?: number; step?: number; slider?: boolean; isExpression?: boolean;
    } & BaseProps<TId, TReq, TItem>): Ret<TId, "Integer", Foundations.Field.Integer, TReq, false> & ItemScopedFlag<TItem>;
    export function Integer<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(config: {
        initialValue?: number;
        min?: number;
        max?: number;
        step?: number;
        slider?: boolean;
        isExpression?: boolean;
    } & BaseProps<TId, TReq, TItem>
    ): Ret<TId, "Integer", Foundations.Field.Integer, TReq, boolean> & ItemScopedFlag<TItem> {
        return {
            ...buildBase(config),
            variant: "Integer",
            initialValue: config.initialValue,
            min: config.min,
            max: config.max,
            step: config.step ?? 1,
            slider: config.slider,
            ...buildIsExpression(config.isExpression),
        } as Ret<TId, "Integer", Foundations.Field.Integer, TReq, boolean> & ItemScopedFlag<TItem>;
    }




    export function Float<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(config: {
        initialValue: number; min?: number; max?: number; step?: number; slider?: boolean; isExpression?: boolean;
    } & BaseProps<TId, TReq, TItem>): Ret<TId, "Float", Foundations.Field.Float, TReq, true> & ItemScopedFlag<TItem>;
    export function Float<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(config: {
        min?: number; max?: number; step?: number; slider?: boolean; isExpression?: boolean;
    } & BaseProps<TId, TReq, TItem>): Ret<TId, "Float", Foundations.Field.Float, TReq, false> & ItemScopedFlag<TItem>;
    export function Float<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(config: {
        initialValue?: number;
        min?: number;
        max?: number;
        step?: number;
        slider?: boolean;
        isExpression?: boolean;
    } & BaseProps<TId, TReq, TItem>
    ): Ret<TId, "Float", Foundations.Field.Float, TReq, boolean> & ItemScopedFlag<TItem> {
        return {
            ...buildBase(config),
            variant: "Float",
            initialValue: config.initialValue ?? 0.0,
            min: config.min,
            max: config.max,
            step: config.step ?? 0.1,
            slider: config.slider,
            ...buildIsExpression(config.isExpression),
        } as Ret<TId, "Float", Foundations.Field.Float, TReq, boolean> & ItemScopedFlag<TItem>;
    }



    export function Boolean<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(config: {
        initialValue: boolean; isExpression?: boolean;
    } & BaseProps<TId, TReq, TItem>): Ret<TId, "Boolean", Foundations.Field.Boolean, TReq, true> & ItemScopedFlag<TItem>;
    export function Boolean<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(
        config: { isExpression?: boolean } & BaseProps<TId, TReq, TItem>
    ): Ret<TId, "Boolean", Foundations.Field.Boolean, TReq, false> & ItemScopedFlag<TItem>;
    export function Boolean<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(config: {
        initialValue?: boolean;
        isExpression?: boolean;
    } & BaseProps<TId, TReq, TItem>
    ): Ret<TId, "Boolean", Foundations.Field.Boolean, TReq, boolean> & ItemScopedFlag<TItem> {
        return {
            ...buildBase(config),
            variant: "Boolean",
            initialValue: config.initialValue ?? false,
            ...buildIsExpression(config.isExpression),
        } as Ret<TId, "Boolean", Foundations.Field.Boolean, TReq, boolean> & ItemScopedFlag<TItem>;
    }



    export type MultiOptionItem<V extends string = string> = {
        value: V;
        displayName?: string;
        description?: string;
    }

    export function MultiOption<
        TId extends string,
        TReq extends boolean = false,
        const TItem extends boolean = false,
        const TOptions extends readonly MultiOptionItem[] = readonly MultiOptionItem[]
    >(config: {
        initialValue: TOptions[number]["value"];
        options: TOptions;
        variant?: "select" | "tab";
        isExpression?: boolean;
    } & BaseProps<TId, TReq, TItem>
    ): Ret<TId, "MultiOption", Foundations.Field.MultiOption, TReq, true> & ItemScopedFlag<TItem> & {
        initialValue: TOptions[number]["value"];
        options: TOptions;
    } {
        return {
            ...buildBase(config),
            variant: "MultiOption",
            initialValue: config.initialValue,
            options: config.options as unknown as Foundations.Field.MultiOption["options"],
            kind: config.variant ?? "select",
            ...buildIsExpression(config.isExpression),
        } as unknown as Ret<TId, "MultiOption", Foundations.Field.MultiOption, TReq, true> & ItemScopedFlag<TItem> & {
            initialValue: TOptions[number]["value"];
            options: TOptions;
        };
    }



    export function File<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(config: {
        initialValue: string; fileTypes?: string[]; isExpression?: boolean;
    } & BaseProps<TId, TReq, TItem>): Ret<TId, "File", Foundations.Field.File, TReq, true> & ItemScopedFlag<TItem>;
    export function File<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(config: {
        fileTypes?: string[]; isExpression?: boolean;
    } & BaseProps<TId, TReq, TItem>): Ret<TId, "File", Foundations.Field.File, TReq, false> & ItemScopedFlag<TItem>;
    export function File<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(config: {
        initialValue?: string;
        fileTypes?: string[];
        isExpression?: boolean;
    } & BaseProps<TId, TReq, TItem>
    ): Ret<TId, "File", Foundations.Field.File, TReq, boolean> & ItemScopedFlag<TItem> {
        return {
            ...buildBase(config),
            variant: "File",
            initialValue: config.initialValue ?? "",
            fileTypes: config.fileTypes,
            ...buildIsExpression(config.isExpression),
        } as Ret<TId, "File", Foundations.Field.File, TReq, boolean> & ItemScopedFlag<TItem>;
    }



    export function List<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(config: {
        initialValue: string[]; isExpression?: boolean;
    } & BaseProps<TId, TReq, TItem>): Ret<TId, "List", Foundations.Field.List, TReq, true> & ItemScopedFlag<TItem>;
    export function List<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(
        config: { isExpression?: boolean } & BaseProps<TId, TReq, TItem>
    ): Ret<TId, "List", Foundations.Field.List, TReq, false> & ItemScopedFlag<TItem>;
    export function List<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(config: {
        initialValue?: string[];
        isExpression?: boolean;
    } & BaseProps<TId, TReq, TItem>
    ): Ret<TId, "List", Foundations.Field.List, TReq, boolean> & ItemScopedFlag<TItem> {
        return {
            ...buildBase(config),
            variant: "List",
            initialValue: config.initialValue ?? [],
            ...buildIsExpression(config.isExpression),
        } as Ret<TId, "List", Foundations.Field.List, TReq, boolean> & ItemScopedFlag<TItem>;
    }



    export function Json<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(config: {
        initialValue: any; isExpression?: boolean;
    } & BaseProps<TId, TReq, TItem>): Ret<TId, "Json", Foundations.Field.Json, TReq, true> & ItemScopedFlag<TItem>;
    export function Json<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(
        config: { isExpression?: boolean } & BaseProps<TId, TReq, TItem>
    ): Ret<TId, "Json", Foundations.Field.Json, TReq, false> & ItemScopedFlag<TItem>;
    export function Json<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(config: {
        initialValue?: any;
        isExpression?: boolean;
    } & BaseProps<TId, TReq, TItem>
    ): Ret<TId, "Json", Foundations.Field.Json, TReq, boolean> & ItemScopedFlag<TItem> {
        return {
            ...buildBase(config),
            variant: "Json",
            initialValue: config.initialValue ?? {},
            ...buildIsExpression(config.isExpression),
        } as Ret<TId, "Json", Foundations.Field.Json, TReq, boolean> & ItemScopedFlag<TItem>;
    }



    export function Password<TId extends string, TReq extends boolean = false>(config: {
        placeholder?: string;
    } & BaseProps<TId, TReq>
    ): Ret<TId, "Password", Foundations.Field.Password, TReq, false> {
        return {
            ...buildBase(config),
            variant: "Password",
            initialValue: "",
            placeholder: config.placeholder,
        };
    }

    export function Secret<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(config: {
        initialValue: string; isExpression?: boolean;
    } & BaseProps<TId, TReq, TItem>): Ret<TId, "Secret", Foundations.Field.Secret, TReq, true> & ItemScopedFlag<TItem>;
    export function Secret<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(
        config: { isExpression?: boolean } & BaseProps<TId, TReq, TItem>
    ): Ret<TId, "Secret", Foundations.Field.Secret, TReq, false> & ItemScopedFlag<TItem>;
    export function Secret<TId extends string, TReq extends boolean = false, const TItem extends boolean = false>(config: {
        initialValue?: string;
        isExpression?: boolean;
    } & BaseProps<TId, TReq, TItem>
    ): Ret<TId, "Secret", Foundations.Field.Secret, TReq, boolean> & ItemScopedFlag<TItem> {
        return {
            ...buildBase(config),
            variant: "Secret",
            initialValue: config.initialValue ?? "",
            ...buildIsExpression(config.isExpression),
        } as Ret<TId, "Secret", Foundations.Field.Secret, TReq, boolean> & ItemScopedFlag<TItem>;
    }



    export function Script<TId extends string, TReq extends boolean = false>(config: {
        initialValue: string;
    } & BaseProps<TId, TReq>): Ret<TId, "Script", Foundations.Field.Script, TReq, true>;
    export function Script<TId extends string, TReq extends boolean = false>(
        config: BaseProps<TId, TReq>
    ): Ret<TId, "Script", Foundations.Field.Script, TReq, false>;
    export function Script<TId extends string, TReq extends boolean = false>(config: {
        initialValue?: string;
    } & BaseProps<TId, TReq>
    ): Ret<TId, "Script", Foundations.Field.Script, TReq, boolean> {
        return {
            ...buildBase(config),
            variant: "Script",
            initialValue: config.initialValue ?? "",
        };
    }

    export function CaseList<TId extends string, TReq extends boolean = false>(
        config: { initialValue?: Foundations.Field.CaseList.Value } & BaseProps<TId, TReq>
    ): Ret<TId, "CaseList", Foundations.Field.CaseList, TReq, true> {
        return {
            ...buildBase(config),
            variant: "CaseList",
            initialValue: config.initialValue ?? [],
        };
    }



    export function Variadic<TId extends string>(
        config: { groupId: string } & BaseProps<TId>
    ): Ret<TId, "Variadic", Foundations.Field.Variadic, false, false> {
        return {
            ...buildBase(config),
            variant: "Variadic",
            initialValue: [],
            groupId: config.groupId as Foundations.Field.Variadic["groupId"],
        };
    }

    export function Condition<TId extends string, TReq extends boolean = false>(config: {
        initialValue: Foundations.Field.Condition.Value;
    } & BaseProps<TId, TReq>): Ret<TId, "Condition", Foundations.Field.Condition, TReq, true>;

    export function Condition<TId extends string, TReq extends boolean = false>(
        config: BaseProps<TId, TReq>
    ): Ret<TId, "Condition", Foundations.Field.Condition, TReq, false>;

    export function Condition<TId extends string, TReq extends boolean = false>(config: {
        initialValue?: Foundations.Field.Condition.Value;
    } & BaseProps<TId, TReq>
    ): Ret<TId, "Condition", Foundations.Field.Condition, TReq, boolean> {
        const rootId = "root" as Foundations.Field.Condition.RuleGroup.Id;
        return {
            ...buildBase(config),
            variant: "Condition",
            initialValue: config.initialValue ?? {
                rootId,
                rules: {
                    "rule1": { id: "rule1", dataType: "string", leftOperand: "", operator: "equals", rightOperand: "" }
                } as Record<Foundations.Field.Condition.Rule.Id, Foundations.Field.Condition.Rule>,
                groups: {
                    [rootId]: { id: rootId, combinator: "AND", children: ["rule1"] },
                } as Record<Foundations.Field.Condition.RuleGroup.Id, Foundations.Field.Condition.RuleGroup>,
            },
        };
    }

    export function ResourceLoader<TId extends string, TReq extends boolean = false>(config: {
        loaderId: string;
        dependsOn?: string[];
        placeholder?: string;
        initialValue?: Foundations.Field.ResourceLoader.Value;
} & BaseProps<TId, TReq>): Ret<TId, "ResourceLoader", Foundations.Field.ResourceLoader, TReq, true> {
        return {
            ...buildBase(config),
            variant: "ResourceLoader",
            loaderId: config.loaderId as Foundations.Field.ResourceLoader.LoaderId,
            dependsOn: (config.dependsOn ?? []) as Foundations.Field.Id[],
            placeholder: config.placeholder ?? "",
            initialValue: config.initialValue ?? { mode: "list", value: "" },
        };
    }
}
