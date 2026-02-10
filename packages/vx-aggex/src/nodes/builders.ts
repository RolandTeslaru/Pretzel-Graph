import { Foundations, Shelf } from "@vx-agent-editor/shared/types";

// ============================================
// INPUT BUILDER
// ============================================


export type InputWithLiteralId<
    TId extends string,
    DerviedInput extends Foundations.Input
> = {
    id: TId & Foundations.Input.Id;
    /** Phantom type property for extracting the literal ID */
    readonly __literalId?: TId;
} & Omit<DerviedInput, "id">

export type OutputWithLiteralId<
    TId extends string,
    DerivedOutput extends Foundations.Output
> = {
    id: TId & Foundations.Output.Id;
    /** Phantom type property for extracting the literal ID */
    readonly __literalId?: TId;
} & Omit<DerivedOutput, "id">

export namespace InputBuilder {

    export type BaseProps = {
        displayName: string;
        hasHandle?: boolean;
        tooltip?: string;
        placeholder?: string;
        advanced: boolean;
        required?: boolean;
        reconcile?: boolean;
    }

    // Helper to build base fields
    function buildBase(
        props: BaseProps,
        handleVariant: Foundations.HandleVariant
    ): Omit<Foundations.Input.Base, "variant" | "initialValue" | "data" | "id"> {
        return {
            required: props.required ?? true,
            reconcile: props.reconcile ?? false,
            asTool: false,
            advanced: props.advanced,
            isRuntime: false,
            handleVariants: props.hasHandle ? [handleVariant] : [],
            uiData: {
                displayName: props.displayName,
                tooltip: props.tooltip,
                placeholder: props.placeholder,
            }
        };
    }

    // ------------------------------------------
    // STRING
    // ------------------------------------------
    export function String<TId extends string>(
        config: {
            id: TId
            initialValue?: string;
            multiline?: boolean;
            hasHandle: boolean
        } & BaseProps
    ): InputWithLiteralId<TId, Foundations.Input.String> {
        return {
            id: config.id as TId & Foundations.Input.Id,
            ...buildBase(config, "Text"),
            variant: "string",
            initialValue: config.initialValue ?? "",
            data: {
                multiline: config.multiline ?? false,
            }
        };
    }

    // ------------------------------------------
    // INTEGER
    // ------------------------------------------
    export function Integer<TId extends string>(config: {
        id: TId;
        initialValue?: number;
        min?: number;
        max?: number;
        step?: number;
        slider?: boolean;
        hasHandle: boolean
    } & BaseProps): InputWithLiteralId<TId, Foundations.Input.Integer> {
        return {
            id: config.id as TId & Foundations.Input.Id,
            ...buildBase(config, "Data"),
            variant: "integer",
            initialValue: config.initialValue ?? 0,
            data: {
                min: config.min,
                max: config.max,
                step: config.step ?? 1,
                slider: config.slider,
            }
        };
    }

    // ------------------------------------------
    // FLOAT
    // ------------------------------------------
    export function Float<TId extends string>(config: {
        id: TId;
        initialValue?: number;
        min?: number;
        max?: number;
        step?: number;
        slider?: boolean;
        hasHandle: boolean
    } & BaseProps): InputWithLiteralId<TId, Foundations.Input.Float> {
        return {
            id: config.id as TId & Foundations.Input.Id,
            ...buildBase(config, "Data"),
            variant: "float",
            initialValue: config.initialValue ?? 0.0,
            data: {
                min: config.min,
                max: config.max,
                step: config.step ?? 0.1,
                slider: config.slider,
            }
        };
    }

    // ------------------------------------------
    // BOOLEAN
    // ------------------------------------------
    export function Boolean<TId extends string>(config: {
        id: TId;
        initialValue?: boolean;
    } & BaseProps): InputWithLiteralId<TId, Foundations.Input.Boolean> {
        return {
            id: config.id as TId & Foundations.Input.Id,
            ...buildBase(config, "Data"),
            variant: "boolean",
            initialValue: config.initialValue ?? false,
        };
    }

    // ------------------------------------------
    // MULTI OPTION (Dropdown/Select/Tab)
    // ------------------------------------------
    export function MultiOption<TId extends string>(config: {
        id: TId;
        initialValue: string;
        options: string[];
        variant?: "select" | "tab";
    } & BaseProps): InputWithLiteralId<TId, Foundations.Input.MultiOption> {
        return {
            id: config.id as TId & Foundations.Input.Id,
            ...buildBase(config, "Text"),
            variant: "multiOption",
            initialValue: config.initialValue,
            data: {
                options: config.options,
                variant: config.variant ?? "select",
            }
        };
    }

    // ------------------------------------------
    // FILE
    // ------------------------------------------
    export function File<TId extends string>(config: {
        id: TId;
        initialValue?: string;
        fileTypes?: string[];
        hasHandle: boolean
    } & BaseProps): InputWithLiteralId<TId, Foundations.Input.File> {
        return {
            id: config.id as TId & Foundations.Input.Id,
            ...buildBase(config, "Data"),
            variant: "file",
            initialValue: config.initialValue ?? "",
            data: {
                fileTypes: config.fileTypes,
            }
        };
    }

    // ------------------------------------------
    // LIST
    // ------------------------------------------
    export function List<TId extends string>(config: {
        id: TId;
        initialValue?: string[];
        hasHandle: boolean
    } & BaseProps): InputWithLiteralId<TId, Foundations.Input.List> {
        return {
            id: config.id as TId & Foundations.Input.Id,
            ...buildBase(config, "Data"),
            variant: "list",
            initialValue: config.initialValue ?? [],
        };
    }

    // ------------------------------------------
    // JSON
    // ------------------------------------------
    export function Json<TId extends string>(config: {
        id: TId;
        initialValue?: any;
        hasHandle: boolean
    } & BaseProps): InputWithLiteralId<TId, Foundations.Input.Json> {
        return {
            id: config.id as TId & Foundations.Input.Id,
            ...buildBase(config, "Data"),
            variant: "json",
            initialValue: config.initialValue ?? {},
        };
    }

    // ------------------------------------------
    // SECRET (Password)
    // ------------------------------------------
    export function Secret<TId extends string>(config: {
        id: TId;
        initialValue?: string;
    } & BaseProps): InputWithLiteralId<TId, Foundations.Input.Secret> {
        return {
            id: config.id as TId & Foundations.Input.Id,
            ...buildBase(config, "Text"),
            variant: "secret",
            initialValue: config.initialValue ?? "",
        };
    }

    // ------------------------------------------
    // SCRIPT / CODE
    // ------------------------------------------
    export function Script<TId extends string>(config: {
        id: TId;
        initialValue?: string;
    } & BaseProps): InputWithLiteralId<TId, Foundations.Input.Script> {
        return {
            id: config.id as TId & Foundations.Input.Id,
            ...buildBase(config, "Text"),
            variant: "script",
            initialValue: config.initialValue ?? "",
        };
    }

    // ------------------------------------------
    // MESSAGE (LangChain Message Handle - Always has handle)
    // ------------------------------------------
    export function Message<TId extends string>(config: {
        id: TId;
    } & Omit<BaseProps, "hasHandle">): InputWithLiteralId<TId, Foundations.Input.String> {
        return {
            id: config.id as TId & Foundations.Input.Id,
            ...buildBase({ ...config, hasHandle: true }, "Message"),
            variant: "string",
            initialValue: "",
            data: { multiline: false }
        };
    }

    // ------------------------------------------
    // LANGUAGE MODEL (LLM Handle - Always has handle)
    // ------------------------------------------
    export function LanguageModel<TId extends string>(config: {
        id: TId;
    } & Omit<BaseProps, "hasHandle">): InputWithLiteralId<TId, Foundations.Input.String> {
        return {
            id: config.id as TId & Foundations.Input.Id,
            ...buildBase({ ...config, hasHandle: true }, "LanguageModel"),
            variant: "string",
            initialValue: "",
            data: { multiline: false }
        };
    }

    // ------------------------------------------
    // DOCUMENT (RAG Handle - Always has handle)
    // ------------------------------------------
    export function Document<TId extends string>(config: {
        id: TId;
    } & Omit<BaseProps, "hasHandle">): InputWithLiteralId<TId, Foundations.Input.String> {
        return {
            id: config.id as TId & Foundations.Input.Id,
            ...buildBase({ ...config, hasHandle: true }, "Document"),
            variant: "string",
            initialValue: "",
            data: { multiline: false }
        };
    }

    // ------------------------------------------
    // RETRIEVER (RAG Handle - Always has handle)
    // ------------------------------------------
    export function Retriever<TId extends string>(config: {
        id: TId;
    } & Omit<BaseProps, "hasHandle">): InputWithLiteralId<TId, Foundations.Input.String> {
        return {
            id: config.id as TId & Foundations.Input.Id,
            ...buildBase({ ...config, hasHandle: true }, "Retriever"),
            variant: "string",
            initialValue: "",
            data: { multiline: false }
        };
    }

    export function Structure<TId extends string>(config: BaseProps & { id: TId }): InputWithLiteralId<TId, Foundations.Input.Structure> {
        return {
            id: config.id as TId & Foundations.Input.Id,
            ...buildBase(config, "Structure"),
            variant: "structure",
            initialValue: {},
        };
    }
}


// ============================================
// OUTPUT BUILDER
// ============================================

export namespace OutputBuilder {

    export type BaseProps = {
        displayName: string;
        tooltip?: string;
    }

    function buildBase(
        props: BaseProps,
        handleVariant: Foundations.HandleVariant
    ): Omit<Foundations.Output, "id"> { // Return Omitted ID
        return {
            handleVariants: [handleVariant],
            asTool: false,
            uiData: {
                displayName: props.displayName,
            }
        };
    }

    // ------------------------------------------
    // TEXT OUTPUT
    // ------------------------------------------
    export function Text<TId extends string>(config: BaseProps & { id: TId }): OutputWithLiteralId<TId, Foundations.Output> {
        return {
            id: config.id as TId & Foundations.Output.Id,
            ...buildBase(config, "Text"),
        };
    }

    // ------------------------------------------
    // MESSAGE OUTPUT
    // ------------------------------------------
    export function Message<TId extends string>(config: BaseProps & { id: TId }): OutputWithLiteralId<TId, Foundations.Output> {
        return {
            id: config.id as TId & Foundations.Output.Id,
            ...buildBase(config, "Message"),
        };
    }

    // ------------------------------------------
    // LANGUAGE MODEL OUTPUT
    // ------------------------------------------
    export function LanguageModel<TId extends string>(config: BaseProps & { id: TId }): OutputWithLiteralId<TId, Foundations.Output> {
        return {
            id: config.id as TId & Foundations.Output.Id,
            ...buildBase(config, "LanguageModel"),
        };
    }

    // ------------------------------------------
    // DOCUMENT OUTPUT
    // ------------------------------------------
    export function Document<TId extends string>(config: BaseProps & { id: TId }): OutputWithLiteralId<TId, Foundations.Output> {
        return {
            id: config.id as TId & Foundations.Output.Id,
            ...buildBase(config, "Document"),
        };
    }

    // ------------------------------------------
    // RETRIEVER OUTPUT
    // ------------------------------------------
    export function Retriever<TId extends string>(config: BaseProps & { id: TId }): OutputWithLiteralId<TId, Foundations.Output> {
        return {
            id: config.id as TId & Foundations.Output.Id,
            ...buildBase(config, "Retriever"),
        };
    }

    // ------------------------------------------
    // EMBEDDINGS OUTPUT
    // ------------------------------------------
    export function Embeddings<TId extends string>(config: BaseProps & { id: TId }): OutputWithLiteralId<TId, Foundations.Output> {
        return {
            id: config.id as TId & Foundations.Output.Id,
            ...buildBase(config, "Embeddings"),
        };
    }

    // ------------------------------------------
    // VECTOR STORE OUTPUT
    // ------------------------------------------
    export function VectorStore<TId extends string>(config: BaseProps & { id: TId }): OutputWithLiteralId<TId, Foundations.Output> {
        return {
            id: config.id as TId & Foundations.Output.Id,
            ...buildBase(config, "VectorStore"),
        };
    }

    // ------------------------------------------
    // TOOL OUTPUT
    // ------------------------------------------
    export function Tool<TId extends string>(config: BaseProps & { id: TId }): OutputWithLiteralId<TId, Foundations.Output> {
        return {
            id: config.id as TId & Foundations.Output.Id,
            ...buildBase(config, "Tool"),
            asTool: true,
        };
    }

    // ------------------------------------------
    // CHAIN / RUNNABLE OUTPUT
    // ------------------------------------------
    export function Chain<TId extends string>(config: BaseProps & { id: TId }): OutputWithLiteralId<TId, Foundations.Output> {
        return {
            id: config.id as TId & Foundations.Output.Id,
            ...buildBase(config, "Chain"),
        };
    }

    // ------------------------------------------
    // DATA (Generic Object)
    // ------------------------------------------
    export function Data<TId extends string>(config: BaseProps & { id: TId }): OutputWithLiteralId<TId, Foundations.Output> {
        return {
            id: config.id as TId & Foundations.Output.Id,
            ...buildBase(config, "Data"),
        };
    }
}


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