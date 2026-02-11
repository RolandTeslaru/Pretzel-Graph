import { Foundations } from "@vx-agent-editor/shared/types";
import { LC } from "src/langchain";

// ============================================
// PHANTOM TYPE UTILITIES
// ============================================

/**
 * Wraps a Foundations.Input with phantom types for compile-time inference.
 * - __literalId: preserves the literal string id (e.g., "temperature" instead of string)
 * - __valueType: carries the runtime type (e.g., BaseMessage). Defaults to `never`, 
 *   which signals InferInputs to fall back to the initialValue type.
 */
export type InputWithLiteralId<
    TId extends string,
    DerivedInput extends Foundations.Input,
    TLangChainInstance = never
> = {
    id: TId & Foundations.Input.Id;
    readonly __literalId?: TId;
    readonly __valueType?: TLangChainInstance;
} & Omit<DerivedInput, "id">

/**
 * Wraps a Foundations.Output with phantom types for compile-time inference.
 * - __literalId: preserves the literal string id
 * - __valueType: carries the runtime type the output produces
 */
export type OutputWithLiteralId<
    TId extends string,
    DerivedOutput extends Foundations.Output,
    TLangChainInstance = never
> = {
    id: TId & Foundations.Output.Id;
    readonly __literalId?: TId;
    readonly __valueType?: TLangChainInstance;
} & Omit<DerivedOutput, "id">


// ============================================
// INPUT BUILDER
// ============================================

export namespace InputBuilder {

    /** Props shared by field-type inputs (user-configurable primitives). */
    export type FieldProps<TId extends string> = {
        id: TId;
        displayName: string;
        tooltip?: string;
        placeholder?: string;
        advanced: boolean;
        required?: boolean;
        reconcile?: boolean;
    }

    /** Props shared by port-type inputs (runtime object references). */
    export type PortProps<TId extends string> = {
        id: TId;
        displayName: string;
        tooltip?: string;
        placeholder?: string;
        advanced: boolean;
        required?: boolean;
        reconcile?: boolean;
    }

    // Internal helpers

    function buildFieldBase<TId extends string>(
        config: FieldProps<TId>,
    ): { id: TId & Foundations.Input.Id } & Omit<Foundations.Input.Base, "id"> {
        return {
            id: config.id as TId & Foundations.Input.Id,
            required: config.required ?? true,
            reconcile: config.reconcile ?? false,
            asTool: false,
            advanced: config.advanced,
            handleVariants: [],
            uiData: {
                displayName: config.displayName,
                tooltip: config.tooltip,
                placeholder: config.placeholder,
            }
        };
    }

    function buildPortBase<TId extends string>(
        config: PortProps<TId>,
        langchainDataTypes: Foundations.HandleVariant[]
    ): { id: TId & Foundations.Input.Id } & Omit<Foundations.Input.Base, "id"> {
        return {
            id: config.id as TId & Foundations.Input.Id,
            required: config.required ?? true,
            reconcile: config.reconcile ?? false,
            asTool: false,
            advanced: config.advanced,
            handleVariants: langchainDataTypes, // forced, not user-configurable
            uiData: {
                displayName: config.displayName,
                tooltip: config.tooltip,
                placeholder: config.placeholder,
            }
        };
    }


    // ---- Field Inputs (user-configurable primitives) ----

    export function String<TId extends string>(
        config: {
            initialValue?: string;
            multiline?: boolean;
        } & FieldProps<TId>
    ): InputWithLiteralId<TId, Foundations.Input.String> {
        return {
            ...buildFieldBase(config),
            variant: "string",
            initialValue: config.initialValue ?? "",
            multiline: config.multiline ?? false
        };
    }

    export function Integer<TId extends string>(config: {
        initialValue?: number;
        min?: number;
        max?: number;
        step?: number;
        slider?: boolean;
    } & FieldProps<TId>): InputWithLiteralId<TId, Foundations.Input.Integer> {
        return {
            ...buildFieldBase(config),
            variant: "integer",
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
    } & FieldProps<TId>): InputWithLiteralId<TId, Foundations.Input.Float> {
        return {
            ...buildFieldBase(config),
            variant: "float",
            initialValue: config.initialValue ?? 0.0,
            min: config.min, 
            max: config.max, 
            step: config.step ?? 0.1, 
            slider: config.slider,
        };
    }

    export function Boolean<TId extends string>(config: {
        initialValue?: boolean;
    } & FieldProps<TId>): InputWithLiteralId<TId, Foundations.Input.Boolean> {
        return {
            ...buildFieldBase(config),
            variant: "boolean",
            initialValue: config.initialValue ?? false,
        };
    }

    export function MultiOption<TId extends string>(config: {
        initialValue: string;
        options: string[];
        variant?: "select" | "tab";
    } & FieldProps<TId>): InputWithLiteralId<TId, Foundations.Input.MultiOption> {
        return {
            ...buildFieldBase(config),
            variant: "multiOption",
            initialValue: config.initialValue,
            options: config.options, 
            kind: config.variant ?? "select",
        };
    }

    export function File<TId extends string>(config: {
        initialValue?: string;
        fileTypes?: string[];
    } & FieldProps<TId>): InputWithLiteralId<TId, Foundations.Input.File> {
        return {
            ...buildFieldBase(config),
            variant: "file",
            initialValue: config.initialValue ?? "",
            fileTypes: config.fileTypes,
        };
    }

    export function List<TId extends string>(config: {
        initialValue?: string[];
    } & FieldProps<TId>): InputWithLiteralId<TId, Foundations.Input.List> {
        return {
            ...buildFieldBase(config),
            variant: "list",
            initialValue: config.initialValue ?? [],
        };
    }

    export function Json<TId extends string>(config: {
        initialValue?: any;
    } & FieldProps<TId>): InputWithLiteralId<TId, Foundations.Input.Json> {
        return {
            ...buildFieldBase(config),
            variant: "json",
            initialValue: config.initialValue ?? {},
        };
    }

    export function Secret<TId extends string>(config: {
        initialValue?: string;
    } & FieldProps<TId>): InputWithLiteralId<TId, Foundations.Input.Secret> {
        return {
            ...buildFieldBase(config),
            variant: "secret",
            initialValue: config.initialValue ?? "",
        };
    }

    export function Script<TId extends string>(config: {
        initialValue?: string;
    } & FieldProps<TId>): InputWithLiteralId<TId, Foundations.Input.Script> {
        return {
            ...buildFieldBase(config),
            variant: "script",
            initialValue: config.initialValue ?? "",
        };
    }

    export function Structure<TId extends string>(config: FieldProps<TId>): InputWithLiteralId<TId, Foundations.Input.Structure> {
        return {
            ...buildFieldBase(config),
            variant: "structure",
            initialValue: {},
        };
    }


    // ---- Port Inputs (runtime object references) ----
    // These receive LangChain class instances at runtime.
    // The __valueType phantom carries the actual runtime type for InferInputs.
    // handleVariants is forced — not user-configurable.

    export function Message<TId extends string>(config: PortProps<TId>): InputWithLiteralId<TId, Foundations.Input.Message, LC.BaseMessage> {
        return {
            ...buildPortBase(config, ["Message"]),
            variant: "message",
            initialValue: "",
        }
    }

    export function LanguageModel<TId extends string>(config: PortProps<TId>): InputWithLiteralId<TId, Foundations.Input.LanguageModel, LC.BaseLanguageModel> {
        return {
            ...buildPortBase(config, ["LanguageModel"]),
            variant: "languageModel",
        }
    }

    export function Document<TId extends string>(config: PortProps<TId>): InputWithLiteralId<TId, Foundations.Input.Document, LC.Document> {
        return {
            ...buildPortBase(config, ["Document"]),
            variant: "document",
        }
    }

    export function Retriever<TId extends string>(config: PortProps<TId>): InputWithLiteralId<TId, Foundations.Input.Retriever, LC.BaseRetriever> {
        return {
            ...buildPortBase(config, ["Retriever"]),
            variant: "retriever",
        }
    }

    export function Embeddings<TId extends string>(config: PortProps<TId>): InputWithLiteralId<TId, Foundations.Input.Embeddings, LC.Embeddings> {
        return {
            ...buildPortBase(config, ["Embeddings"]),
            variant: "embeddings",
        }
    }

    export function VectorStore<TId extends string>(config: PortProps<TId>): InputWithLiteralId<TId, Foundations.Input.VectorStore, LC.VectorStore> {
        return {
            ...buildPortBase(config, ["VectorStore"]),
            variant: "vectorStore",
        }
    }

    export function Tool<TId extends string>(config: PortProps<TId>): InputWithLiteralId<TId, Foundations.Input.Tool, LC.Tool> {
        return {
            ...buildPortBase(config, ["Tool"]),
            variant: "tool",
        }
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

    function buildBase<TId extends string>(config: BaseProps<TId>): { id: TId & Foundations.Output.Id } & Pick<Foundations.Output.Base, "asTool" | "uiData"> {
        return {
            id: config.id as TId & Foundations.Output.Id,
            asTool: false,
            uiData: {
                displayName: config.displayName,
            }
        };
    }

    export function Message<TId extends string>(config: BaseProps<TId>): OutputWithLiteralId<TId, Foundations.Output.Message, LC.BaseMessage> {
        return {
            ...buildBase(config),
            variant: "message",
            handleVariants: ["Message"],
        }
    }

    export function Text<TId extends string>(config: BaseProps<TId>): OutputWithLiteralId<TId, Foundations.Output.Text, string> {
        return {
            ...buildBase(config),
            variant: "text",
            handleVariants: ["Text"],
        }
    }

    export function LanguageModel<TId extends string>(config: BaseProps<TId>): OutputWithLiteralId<TId, Foundations.Output.LanguageModel, LC.BaseLanguageModel> {
        return {
            ...buildBase(config),
            variant: "languageModel",
            handleVariants: ["LanguageModel"],
        }
    }

    export function Document<TId extends string>(config: BaseProps<TId>): OutputWithLiteralId<TId, Foundations.Output.Document, LC.Document> {
        return {
            ...buildBase(config),
            variant: "document",
            handleVariants: ["Document"],
        }
    }

    export function Retriever<TId extends string>(config: BaseProps<TId>): OutputWithLiteralId<TId, Foundations.Output.Retriever, LC.BaseRetriever> {
        return {
            ...buildBase(config),
            variant: "retriever",
            handleVariants: ["Retriever"],
        } as any;
    }

    export function Embeddings<TId extends string>(config: BaseProps<TId>): OutputWithLiteralId<TId, Foundations.Output.Embeddings, LC.Embeddings> {
        return {
            ...buildBase(config),
            variant: "embeddings",
            handleVariants: ["Embeddings"],
        }
    }

    export function VectorStore<TId extends string>(config: BaseProps<TId>): OutputWithLiteralId<TId, Foundations.Output.VectorStore, LC.VectorStore> {
        return {
            ...buildBase(config),
            variant: "vectorStore",
            handleVariants: ["VectorStore"],
        }
    }

    export function Tool<TId extends string>(config: BaseProps<TId>): OutputWithLiteralId<TId, Foundations.Output.Tool, LC.Tool> {
        return {
            ...buildBase(config),
            variant: "tool",
            handleVariants: ["Tool"],
            asTool: true,
        }
    }

    export function DataFrame<TId extends string>(config: BaseProps<TId>): OutputWithLiteralId<TId, Foundations.Output.DataFrame, any> {
        return {
            ...buildBase(config),
            variant: "dataFrame",
            handleVariants: ["DataFrame"],
        }
    }

    export function Data<TId extends string>(config: BaseProps<TId>): OutputWithLiteralId<TId, Foundations.Output.Data, any> {
        return {
            ...buildBase(config),
            variant: "data",
            handleVariants: ["Data"],
        }
    }
}


// ============================================
// BLUEPRINT BUILDER
// ============================================

// Explicit return type to avoid "cannot be named without reference to zod internals" error
type DefineBlueprintReturn<
    TId extends string,
    TInputs extends readonly Foundations.Input[],
    TOutputs extends readonly Foundations.Output[]
> = {
    readonly id: TId & Foundations.Blueprint.Id;
    readonly displayName: string;
    readonly description: string;
    readonly icon: string;
    readonly inputs: TInputs;
    readonly outputs: TOutputs;
}

export function defineBlueprint<
    const TId extends string,
    const TInputs extends readonly Foundations.Input[],
    const TOutputs extends readonly Foundations.Output[]
>(config: {
    id: TId;
    displayName: string;
    description: string;
    icon: string;
    inputs: TInputs;
    outputs: TOutputs;
}): DefineBlueprintReturn<TId, TInputs, TOutputs> {
    return {
        id: config.id as TId & Foundations.Blueprint.Id,
        displayName: config.displayName,
        description: config.description,
        icon: config.icon,
        inputs: config.inputs,
        outputs: config.outputs,
    };
}