import { Foundations } from "@vx-agent-editor/shared/domain";

export type LiteralField<
    T_Id extends string,
    T_Variant extends Foundations.Field.Variant,
    T_Field extends Foundations.Field,
> = {
    id: T_Id & Foundations.Field.Id;
    readonly __literalId?: T_Id;
    readonly __variant?: T_Variant;
} & Omit<T_Field, "id">

export type OmitId<T> = Omit<T, "id">

export namespace FieldBuilder {

    export type BaseProps<T_Id extends string> = {
        id: T_Id;
        advanced?: boolean;
        displayName: string;
        tooltip?: string;
        reconcile?: boolean;
        required?: boolean;
    }

    export const buildBase = <TId extends string>(
        props: BaseProps<TId>
    ) => {
        return {
            id: props.id as TId & Foundations.Field.Id,
            displayName: props.displayName,
            tooltip: props.tooltip,
            required: props.required ?? false,
            advanced: props.advanced ?? false,
            reconcile: props.reconcile ?? false,
        } satisfies { id: TId & Foundations.Field.Id } & OmitId<Foundations.Field.Base>
    }





    export function String<T_Id extends string>(
        config: {
            initialValue?: string;
            multiline?: boolean;
            placeholder?: string;
        } & BaseProps<T_Id>
    ): LiteralField<T_Id, "String", Foundations.Field.String> {
        return {
            ...buildBase(config),
            variant: "String",
            placeholder: config.placeholder ?? "",
            initialValue: config.initialValue ?? "",
            multiline: config.multiline ?? false
        };
    }




    export function Integer<T_Id extends string>(config: {
        initialValue?: number;
        min?: number;
        max?: number;
        step?: number;
        slider?: boolean;
    } & BaseProps<T_Id>
    ): LiteralField<T_Id, "Integer", Foundations.Field.Integer> {
        return {
            ...buildBase(config),
            variant: "Integer",
            initialValue: config.initialValue ?? 0,
            min: config.min,
            max: config.max,
            step: config.step ?? 1,
            slider: config.slider,
        };
    }




    export function Float<TId extends string>(config: {
        initialValue?: number;
        min?: number;
        max?: number;
        step?: number;
        slider?: boolean;
    } & BaseProps<TId>): LiteralField<TId, "Float", Foundations.Field.Float> {
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



    export function Boolean<TId extends string>(config: {
        initialValue?: boolean;
    } & BaseProps<TId>
    ): LiteralField<TId, "Boolean", Foundations.Field.Boolean> {
        return {
            ...buildBase(config),
            variant: "Boolean",
            initialValue: config.initialValue ?? false,
        };
    }



    export function MultiOption<TId extends string>(config: {
        initialValue: string;
        options: string[];
        variant?: "select" | "tab";
    } & BaseProps<TId>): LiteralField<TId, "MultiOption", Foundations.Field.MultiOption> {
        return {
            ...buildBase(config),
            variant: "MultiOption",
            initialValue: config.initialValue,
            options: config.options,
            kind: config.variant ?? "select",
        };
    }



    export function File<TId extends string>(config: {
        initialValue?: string;
        fileTypes?: string[];
    } & BaseProps<TId>): LiteralField<TId, "File", Foundations.Field.File> {
        return {
            ...buildBase(config),
            variant: "File",
            initialValue: config.initialValue ?? "",
            fileTypes: config.fileTypes,
        };
    }



    export function List<TId extends string>(config: {
        initialValue?: string[];
    } & BaseProps<TId>): LiteralField<TId, "List", Foundations.Field.List> {
        return {
            ...buildBase(config),
            variant: "List",
            initialValue: config.initialValue ?? [],
        };
    }



    export function Json<TId extends string>(config: {
        initialValue?: any;
    } & BaseProps<TId>): LiteralField<TId, "Json", Foundations.Field.Json> {
        return {
            ...buildBase(config),
            variant: "Json",
            initialValue: config.initialValue ?? {},
        };
    }



    export function Secret<TId extends string>(config: {
        initialValue?: string;
    } & BaseProps<TId>): LiteralField<TId, "Secret", Foundations.Field.Secret> {
        return {
            ...buildBase(config),
            variant: "Secret",
            initialValue: config.initialValue ?? "",
        };
    }



    export function Script<TId extends string>(config: {
        initialValue?: string;
    } & BaseProps<TId>): LiteralField<TId, "Script", Foundations.Field.Script> {
        return {
            ...buildBase(config),
            variant: "Script",
            initialValue: config.initialValue ?? "",
        };
    }
}
