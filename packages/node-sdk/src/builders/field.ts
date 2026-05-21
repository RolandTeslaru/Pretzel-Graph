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

    export type BaseProps<TId extends string, TReq extends boolean = false> = {
        id: TId;
        required?: TReq;
        advanced?: boolean;
        hidden?: boolean;
        displayName: string;
        tooltip?: string;
        reconcile?: boolean;
    }

    /** Shorthand: return type for every builder */
    type Ret<TId extends string, V extends Foundations.Field.Variant, F extends Foundations.Field, TReq extends boolean, THasInit extends boolean = false> =
        LiteralField<TId, V, F, TReq, THasInit>

    export const buildBase = <TId extends string>(
        props: BaseProps<TId, boolean>
    ) => {
        return {
            id: props.id as TId & Foundations.Field.Id,
            displayName: props.displayName,
            tooltip: props.tooltip,
            required: props.required ?? false,
            advanced: props.advanced ?? false,
            reconcile: props.reconcile ?? false,
            hidden: props.hidden,
        } satisfies { id: TId & Foundations.Field.Id } & OmitId<Foundations.Field.Base>
    }





    export function UniqueString<TId extends string, TReq extends boolean = false>(
        config: { prefix?: string; length?: number; placeholder?: string; } & BaseProps<TId, TReq>
    ): Ret<TId, "UniqueString", Foundations.Field.UniqueString, TReq, true> {
        return {
            ...buildBase(config),
            variant: "UniqueString",
            placeholder: config.placeholder ?? "",
            prefix: config.prefix,
            length: config.length,
            // Placeholder; real value is generated per-node at create time.
            initialValue: "",
        };
    }

    export function String<TId extends string, TReq extends boolean = false>(
        config: { initialValue: string; multiline?: boolean; placeholder?: string; } & BaseProps<TId, TReq>
    ): Ret<TId, "String", Foundations.Field.String, TReq, true>;
    export function String<TId extends string, TReq extends boolean = false>(
        config: { multiline?: boolean; placeholder?: string; } & BaseProps<TId, TReq>
    ): Ret<TId, "String", Foundations.Field.String, TReq, false>;
    export function String<TId extends string, TReq extends boolean = false>(
        config: {
            initialValue?: string;
            multiline?: boolean;
            placeholder?: string;
        } & BaseProps<TId, TReq>
    ): Ret<TId, "String", Foundations.Field.String, TReq, boolean> {
        return {
            ...buildBase(config),
            variant: "String",
            placeholder: config.placeholder ?? "",
            initialValue: config.initialValue ?? "",
            multiline: config.multiline ?? false
        };
    }




    export function Integer<TId extends string, TReq extends boolean = false>(config: {
        initialValue: number; min?: number; max?: number; step?: number; slider?: boolean;
    } & BaseProps<TId, TReq>): Ret<TId, "Integer", Foundations.Field.Integer, TReq, true>;
    export function Integer<TId extends string, TReq extends boolean = false>(config: {
        min?: number; max?: number; step?: number; slider?: boolean;
    } & BaseProps<TId, TReq>): Ret<TId, "Integer", Foundations.Field.Integer, TReq, false>;
    export function Integer<TId extends string, TReq extends boolean = false>(config: {
        initialValue?: number;
        min?: number;
        max?: number;
        step?: number;
        slider?: boolean;
    } & BaseProps<TId, TReq>
    ): Ret<TId, "Integer", Foundations.Field.Integer, TReq, boolean> {
        return {
            ...buildBase(config),
            variant: "Integer",
            initialValue: config.initialValue,
            min: config.min,
            max: config.max,
            step: config.step ?? 1,
            slider: config.slider,
        };
    }




    export function Float<TId extends string, TReq extends boolean = false>(config: {
        initialValue: number; min?: number; max?: number; step?: number; slider?: boolean;
    } & BaseProps<TId, TReq>): Ret<TId, "Float", Foundations.Field.Float, TReq, true>;
    export function Float<TId extends string, TReq extends boolean = false>(config: {
        min?: number; max?: number; step?: number; slider?: boolean;
    } & BaseProps<TId, TReq>): Ret<TId, "Float", Foundations.Field.Float, TReq, false>;
    export function Float<TId extends string, TReq extends boolean = false>(config: {
        initialValue?: number;
        min?: number;
        max?: number;
        step?: number;
        slider?: boolean;
    } & BaseProps<TId, TReq>
    ): Ret<TId, "Float", Foundations.Field.Float, TReq, boolean> {
        return {
            ...buildBase(config),
            variant: "Float",
            initialValue: config.initialValue ?? 0.0,
            min: config.min,
            max: config.max,
            step: config.step ?? 0.1,
            slider: config.slider,
        };
    }



    export function Boolean<TId extends string, TReq extends boolean = false>(config: {
        initialValue: boolean;
    } & BaseProps<TId, TReq>): Ret<TId, "Boolean", Foundations.Field.Boolean, TReq, true>;
    export function Boolean<TId extends string, TReq extends boolean = false>(
        config: BaseProps<TId, TReq>
    ): Ret<TId, "Boolean", Foundations.Field.Boolean, TReq, false>;
    export function Boolean<TId extends string, TReq extends boolean = false>(config: {
        initialValue?: boolean;
    } & BaseProps<TId, TReq>
    ): Ret<TId, "Boolean", Foundations.Field.Boolean, TReq, boolean> {
        return {
            ...buildBase(config),
            variant: "Boolean",
            initialValue: config.initialValue ?? false,
        };
    }



    export type MultiOptionItem<V extends string = string> = {
        value: V;
        displayName?: string;
    }

    export function MultiOption<
        TId extends string,
        TReq extends boolean = false,
        const TOptions extends readonly MultiOptionItem[] = readonly MultiOptionItem[]
    >(config: {
        initialValue: TOptions[number]["value"];
        options: TOptions;
        variant?: "select" | "tab";
    } & BaseProps<TId, TReq>
    ): Ret<TId, "MultiOption", Foundations.Field.MultiOption, TReq, true> & {
        initialValue: TOptions[number]["value"];
        options: TOptions;
    } {
        return {
            ...buildBase(config),
            variant: "MultiOption",
            initialValue: config.initialValue,
            options: config.options as unknown as Foundations.Field.MultiOption["options"],
            kind: config.variant ?? "select",
        } as Ret<TId, "MultiOption", Foundations.Field.MultiOption, TReq, true> & {
            initialValue: TOptions[number]["value"];
            options: TOptions;
        };
    }



    export function File<TId extends string, TReq extends boolean = false>(config: {
        initialValue: string; fileTypes?: string[];
    } & BaseProps<TId, TReq>): Ret<TId, "File", Foundations.Field.File, TReq, true>;
    export function File<TId extends string, TReq extends boolean = false>(config: {
        fileTypes?: string[];
    } & BaseProps<TId, TReq>): Ret<TId, "File", Foundations.Field.File, TReq, false>;
    export function File<TId extends string, TReq extends boolean = false>(config: {
        initialValue?: string;
        fileTypes?: string[];
    } & BaseProps<TId, TReq>
    ): Ret<TId, "File", Foundations.Field.File, TReq, boolean> {
        return {
            ...buildBase(config),
            variant: "File",
            initialValue: config.initialValue ?? "",
            fileTypes: config.fileTypes,
        };
    }



    export function List<TId extends string, TReq extends boolean = false>(config: {
        initialValue: string[];
    } & BaseProps<TId, TReq>): Ret<TId, "List", Foundations.Field.List, TReq, true>;
    export function List<TId extends string, TReq extends boolean = false>(
        config: BaseProps<TId, TReq>
    ): Ret<TId, "List", Foundations.Field.List, TReq, false>;
    export function List<TId extends string, TReq extends boolean = false>(config: {
        initialValue?: string[];
    } & BaseProps<TId, TReq>
    ): Ret<TId, "List", Foundations.Field.List, TReq, boolean> {
        return {
            ...buildBase(config),
            variant: "List",
            initialValue: config.initialValue ?? [],
        };
    }



    export function Json<TId extends string, TReq extends boolean = false>(config: {
        initialValue: any;
    } & BaseProps<TId, TReq>): Ret<TId, "Json", Foundations.Field.Json, TReq, true>;
    export function Json<TId extends string, TReq extends boolean = false>(
        config: BaseProps<TId, TReq>
    ): Ret<TId, "Json", Foundations.Field.Json, TReq, false>;
    export function Json<TId extends string, TReq extends boolean = false>(config: {
        initialValue?: any;
    } & BaseProps<TId, TReq>
    ): Ret<TId, "Json", Foundations.Field.Json, TReq, boolean> {
        return {
            ...buildBase(config),
            variant: "Json",
            initialValue: config.initialValue ?? {},
        };
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

    export function Secret<TId extends string, TReq extends boolean = false>(config: {
        initialValue: string;
    } & BaseProps<TId, TReq>): Ret<TId, "Secret", Foundations.Field.Secret, TReq, true>;
    export function Secret<TId extends string, TReq extends boolean = false>(
        config: BaseProps<TId, TReq>
    ): Ret<TId, "Secret", Foundations.Field.Secret, TReq, false>;
    export function Secret<TId extends string, TReq extends boolean = false>(config: {
        initialValue?: string;
    } & BaseProps<TId, TReq>
    ): Ret<TId, "Secret", Foundations.Field.Secret, TReq, boolean> {
        return {
            ...buildBase(config),
            variant: "Secret",
            initialValue: config.initialValue ?? "",
        };
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
}
