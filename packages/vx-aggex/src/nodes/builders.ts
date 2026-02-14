import { Foundations } from "@vx-agent-editor/shared/domain";
import { LC } from "src/langchain";


export type OmitId<T> = Omit<T, "id">
export type OverrideId<T, T_Id extends string> = Omit<T, "id"> & { id: T_Id }

// ============================================
// PHANTOM TYPE UTILITIES
// ============================================

/**
 * Wraps a Foundations.Port.Input with phantom types for compile-time inference.
 * - __literalId: preserves the literal string id (e.g., "temperature" instead of string)
 * - __langchainValueType: carries the runtime type (e.g., BaseMessage). Defaults to `never`, 
 *   which signals InferInputs to fall back to the initialValue type.
 */
export type LiteralInput<
    T_Id extends string,
    T_Variant extends Foundations.Port.Variant,
    T_Input extends Foundations.Port.Base,
    T_Reference = never,
> = {
    id: T_Id & Foundations.Port.Input.Id;
    required: boolean;
    readonly __literalId?: T_Id;
    readonly __variant?: T_Variant;
    readonly __reference?: T_Reference;
} & Omit<T_Input, "id">

/**
 * Wraps a Foundations.Port.Output with phantom types for compile-time inference.
 * - __literalId: preserves the literal string id
 * - __variant: carries the variant type of the output
 */
export type LiteralOutput<
    T_Id extends string,
    T_Variant extends Foundations.Port.Variant,
    T_Output extends Foundations.Port.Base,
    T_Reference = never,
> = {
    id: T_Id & Foundations.Port.Output.Id;
    readonly __literalId?: T_Id;
    readonly __variant?: T_Variant;
    readonly __reference?: T_Reference;
} & Omit<T_Output, "id">


export type LiteralField<
    T_Id extends string,
    T_Variant extends Foundations.Field.Variant,
    T_Field extends Foundations.Field,
> = {
    id: T_Id & Foundations.Field.Id;
    readonly __literalId?: T_Id;
    readonly __variant?: T_Variant;
} & Omit<T_Field, "id">

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
            required: props.required ?? true,
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


// ============================================
// INPUT BUILDER
// ============================================

export namespace InputBuilder {

    /** Props shared by port-type inputs (runtime object references). */
    export type BaseProps<TId extends string> = {
        id: TId;
        displayName: string;
        tooltip?: string;
        placeholder?: string;
        required?: boolean;
    }

    function buildBase<TId extends string>(
        props: BaseProps<TId>,
    ) {
        return {
            id: props.id as TId & Foundations.Port.Input.Id,
            required: props.required ?? true,
            displayName: props.displayName,
            tooltip: props.tooltip,
        } satisfies { id: TId & Foundations.Port.Input.Id } & Omit<Foundations.Port.Input.Base, "id">;
    }



    // ---- Port Inputs (runtime object references) ----
    // These receive LangChain class instances at runtime.
    // Explicit return types ensure phantom properties (__literalId, __reference) are
    // visible to InferInputs for key extraction and value type resolution.

    export function Message<TId extends string>(
        config: BaseProps<TId>
    ): LiteralInput<TId, "Message", Foundations.Port.Variants.Message, LC.BaseMessage> {
        return {
            ...buildBase(config),
            variant: "Message" as const,
            initialValue: "",
        };
    }

    export function Text<TId extends string>(
        config: BaseProps<TId>
    ): LiteralInput<TId, "Text", Foundations.Port.Variants.Text, string> {
        return {
            ...buildBase(config),
            variant: "Text" as const,
            initialValue: "",
        };
    }

    export function LanguageModel<TId extends string>(
        config: BaseProps<TId>
    ): LiteralInput<TId, "LanguageModel", Foundations.Port.Variants.LanguageModel, LC.BaseLanguageModel> {
        return {
            ...buildBase(config),
            variant: "LanguageModel" as const,
        };
    }

    export function Document<TId extends string>(
        config: BaseProps<TId>
    ): LiteralInput<TId, "Document", Foundations.Port.Variants.Document, LC.Document> {
        return {
            ...buildBase(config),
            variant: "Document" as const,
        };
    }

    export function Retriever<TId extends string>(
        config: BaseProps<TId>
    ): LiteralInput<TId, "Retriever", Foundations.Port.Variants.Retriever, LC.BaseRetriever> {
        return {
            ...buildBase(config),
            variant: "Retriever" as const,
        };
    }

    export function Embeddings<TId extends string>(
        config: BaseProps<TId>
    ): LiteralInput<TId, "Embeddings", Foundations.Port.Variants.Embeddings, LC.Embeddings> {
        return {
            ...buildBase(config),
            variant: "Embeddings" as const,
        };
    }

    export function VectorStore<TId extends string>(
        config: BaseProps<TId>
    ): LiteralInput<TId, "VectorStore", Foundations.Port.Variants.VectorStore, LC.VectorStore> {
        return {
            ...buildBase(config),
            variant: "VectorStore" as const,
        };
    }

    export function Tool<TId extends string>(
        config: BaseProps<TId>
    ): LiteralInput<TId, "Tool", Foundations.Port.Variants.Tool, LC.Tool> {
        return {
            ...buildBase(config),
            variant: "Tool" as const,
        };
    }
}


// ============================================
// OUTPUT BUILDER
// ============================================

export namespace OutputBuilder {

    export type BaseProps<TId extends string> = {
        id: TId;
        displayName: string;
        tooltip?: string;
    }

    function buildBase<TId extends string>(config: BaseProps<TId>) {
        return {
            id: config.id as TId & Foundations.Port.Output.Id,
            displayName: config.displayName,
            tooltip: config.tooltip,
        } satisfies { id: TId & Foundations.Port.Output.Id } & Omit<Foundations.Port.Output.Base, "id">;
    }

    export function Message<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Message", Foundations.Port.Variants.Message, LC.BaseMessage> {
        return {
            ...buildBase(config),
            variant: "Message" as const,
        };
    }

    export function Text<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Text", Foundations.Port.Variants.Text, string> {
        return {
            ...buildBase(config),
            variant: "Text" as const,
        };
    }

    export function LanguageModel<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "LanguageModel", Foundations.Port.Variants.LanguageModel, LC.BaseLanguageModel> {
        return {
            ...buildBase(config),
            variant: "LanguageModel" as const,
        };
    }

    export function Document<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Document", Foundations.Port.Variants.Document, LC.Document> {
        return {
            ...buildBase(config),
            variant: "Document" as const,
        };
    }

    export function Retriever<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Retriever", Foundations.Port.Variants.Retriever, LC.BaseRetriever> {
        return {
            ...buildBase(config),
            variant: "Retriever" as const,
        };
    }

    export function Embeddings<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Embeddings", Foundations.Port.Variants.Embeddings, LC.Embeddings> {
        return {
            ...buildBase(config),
            variant: "Embeddings" as const,
        };
    }

    export function VectorStore<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "VectorStore", Foundations.Port.Variants.VectorStore, LC.VectorStore> {
        return {
            ...buildBase(config),
            variant: "VectorStore" as const,
        };
    }

    export function Tool<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Tool", Foundations.Port.Variants.Tool, LC.Tool> {
        return {
            ...buildBase(config),
            variant: "Tool" as const,
        };
    }

    export function Integer<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Integer", Foundations.Port.Variants.Integer, number> {
        return {
            ...buildBase(config),
            variant: "Integer" as const,
        };
    }

    export function Json<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Json", Foundations.Port.Variants.Json, any> {
        return {
            ...buildBase(config),
            variant: "Json" as const,
        };
    }

    export function DataFrame<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "DataFrame", Foundations.Port.Variants.DataFrame, any> {
        return {
            ...buildBase(config),
            variant: "DataFrame" as const,
        };
    }
}


// ============================================
// BLUEPRINT BUILDER
// ============================================

// Explicit return type to avoid "cannot be named without reference to zod internals" error
type DefineBlueprintReturn<
    TId extends string,
    TFields extends readonly Foundations.Field[],
    TInputs extends readonly Foundations.Port.Input[],
    TOutputs extends readonly Foundations.Port.Output[]
> = {
    readonly id: TId & Foundations.Blueprint.Id;
    readonly displayName: string;
    readonly description: string;
    readonly icon: string;
    readonly fields: TFields;
    readonly inputs: TInputs;
    readonly outputs: TOutputs;
}

export function defineBlueprint<
    const TId extends string,
    const TFields extends readonly Foundations.Field[],
    const TInputs extends readonly Foundations.Port.Input[],
    const TOutputs extends readonly Foundations.Port.Output[]
>(config: {
    id: TId;
    displayName: string;
    description: string;
    icon: string;
    fields: TFields;
    inputs: TInputs;
    outputs: TOutputs;
}): DefineBlueprintReturn<TId, TFields, TInputs, TOutputs> {
    return {
        id: config.id as TId & Foundations.Blueprint.Id,
        displayName: config.displayName,
        description: config.description,
        icon: config.icon,
        fields: config.fields,
        inputs: config.inputs,
        outputs: config.outputs,
    };
}