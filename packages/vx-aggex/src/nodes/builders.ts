import { Foundations } from "@vx-agent-editor/shared/types";
import { LC } from "src/langchain";


export type OmitId<T> = Omit<T, "id">
export type OverrideId<T, T_Id extends string> = Omit<T, "id"> & { id: T_Id }

// ============================================
// PHANTOM TYPE UTILITIES
// ============================================

/**
 * Wraps a Foundations.Input with phantom types for compile-time inference.
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
 * Wraps a Foundations.Output with phantom types for compile-time inference.
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


export type LiteralConfig<
    T_Id extends string,
    T_Variant extends Foundations.NodeConfig.Variant,
    T_Config extends Foundations.NodeConfig,
> = {
    id: T_Id & Foundations.NodeConfig.Id;
    readonly __literalId?: T_Id;
    readonly __variant?: T_Variant;
} & Omit<T_Config, "id">

export namespace ConfigBuilder {

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
            id: props.id as TId & Foundations.NodeConfig.Id,
            displayName: props.displayName,
            tooltip: props.tooltip,
            required: props.required ?? true,
            advanced: props.advanced ?? false,
            reconcile: props.reconcile ?? false,
        } satisfies { id: TId & Foundations.NodeConfig.Id } & OmitId<Foundations.NodeConfig.Base>
    }





    export function String<T_Id extends string>(
        config: {
            initialValue?: string;
            multiline?: boolean;
        } & BaseProps<T_Id>
    ) {
        return {
            ...buildBase(config),
            variant: "String",
            initialValue: config.initialValue ?? "",
            multiline: config.multiline ?? false
        } satisfies LiteralConfig<T_Id, "String", Foundations.NodeConfig.String>
    }




    export function Integer<T_Id extends string>(config: {
        initialValue?: number;
        min?: number;
        max?: number;
        step?: number;
        slider?: boolean;
    } & BaseProps<T_Id>
    ) {
        return {
            ...buildBase(config),
            variant: "Integer",
            initialValue: config.initialValue ?? 0,
            min: config.min,
            max: config.max,
            step: config.step ?? 1,
            slider: config.slider,

        } satisfies LiteralConfig<T_Id, "Integer", Foundations.NodeConfig.Integer>
    }




    export function Float<TId extends string>(config: {
        initialValue?: number;
        min?: number;
        max?: number;
        step?: number;
        slider?: boolean;
    } & BaseProps<TId>) {
        return {
            ...buildBase(config),
            variant: "Float",
            initialValue: config.initialValue ?? 0.0,
            min: config.min,
            max: config.max,
            step: config.step ?? 0.1,
            slider: config.slider,
        } satisfies LiteralConfig<TId, "Float", Foundations.NodeConfig.Float>;
    }



    export function Boolean<TId extends string>(config: {
        initialValue?: boolean;
    } & BaseProps<TId>
    ) {
        return {
            ...buildBase(config),
            variant: "Boolean",
            initialValue: config.initialValue ?? false,
        } satisfies LiteralConfig<TId, "Boolean", Foundations.NodeConfig.Boolean>;
    }



    export function MultiOption<TId extends string>(config: {
        initialValue: string;
        options: string[];
        variant?: "select" | "tab";
    } & BaseProps<TId>) {
        return {
            ...buildBase(config),
            variant: "MultiOption",
            initialValue: config.initialValue,
            options: config.options,
            kind: config.variant ?? "select",
        } satisfies LiteralConfig<TId, "MultiOption", Foundations.NodeConfig.MultiOption>
    }



    export function File<TId extends string>(config: {
        initialValue?: string;
        fileTypes?: string[];
    } & BaseProps<TId>) {
        return {
            ...buildBase(config),
            variant: "File",
            initialValue: config.initialValue ?? "",
            fileTypes: config.fileTypes,
        } satisfies LiteralConfig<TId, "File", Foundations.NodeConfig.File>;
    }



    export function List<TId extends string>(config: {
        initialValue?: string[];
    } & BaseProps<TId>) {
        return {
            ...buildBase(config),
            variant: "List",
            initialValue: config.initialValue ?? [],
        } satisfies LiteralConfig<TId, "List", Foundations.NodeConfig.List>;
    }



    export function Json<TId extends string>(config: {
        initialValue?: any;
    } & BaseProps<TId>) {
        return {
            ...buildBase(config),
            variant: "Json",
            initialValue: config.initialValue ?? {},
        } satisfies LiteralConfig<TId, "Json", Foundations.NodeConfig.Json>;
    }



    export function Secret<TId extends string>(config: {
        initialValue?: string;
    } & BaseProps<TId>) {
        return {
            ...buildBase(config),
            variant: "Secret",
            initialValue: config.initialValue ?? "",
        } satisfies LiteralConfig<TId, "Secret", Foundations.NodeConfig.Secret>;
    }



    export function Script<TId extends string>(config: {
        initialValue?: string;
    } & BaseProps<TId>) {
        return {
            ...buildBase(config),
            variant: "Script",
            initialValue: config.initialValue ?? "",
        } satisfies LiteralConfig<TId, "Script", Foundations.NodeConfig.Script>;
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
    ){
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
    TConfig extends Record<string, Foundations.NodeConfig>,
    TInputs extends readonly Foundations.Port.Input[],
    TOutputs extends readonly Foundations.Port.Output[]
> = {
    readonly id: TId & Foundations.Blueprint.Id;
    readonly displayName: string;
    readonly description: string;
    readonly icon: string;
    readonly config: TConfig;
    readonly inputs: TInputs;
    readonly outputs: TOutputs;
}

export function defineBlueprint<
    const TId extends string,
    const TConfig extends Record<string, Foundations.NodeConfig>,
    const TInputs extends readonly Foundations.Port.Input[],
    const TOutputs extends readonly Foundations.Port.Output[]
>(config: {
    id: TId;
    displayName: string;
    description: string;
    icon: string;
    config: TConfig;
    inputs: TInputs;
    outputs: TOutputs;
}): DefineBlueprintReturn<TId, TConfig, TInputs, TOutputs> {
    return {
        id: config.id as TId & Foundations.Blueprint.Id,
        displayName: config.displayName,
        description: config.description,
        icon: config.icon,
        config: config.config,
        inputs: config.inputs,
        outputs: config.outputs,
    };
}