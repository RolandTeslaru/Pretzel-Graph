import { Foundations } from "@vx-agent-editor/shared/types";
import { Workflow } from "@vx-agent-editor/shared/types/Workflow";

// ============================================
// INPUT BUILDER
// ============================================

export namespace InputBuilder {

    export type BaseProps = {
        displayName: string;
        hasHandle?: boolean;
        tooltip?: string;
        placeholder?: string;
        required?: boolean;
        reconcile?: boolean;
    }

    // Helper to build base fields
    function buildBase(
        props: BaseProps,
        langChainDataType: Foundations.LangChainDataType
    ): Omit<Foundations.Input.Base, "variant" | "initialValue" | "data"> {
        return {
            id: "" as Foundations.Input.Id, // Will be assigned by transform layer
            required: props.required ?? true,
            reconcile: props.reconcile ?? false,
            asTool: false,
            isRuntime: false,
            langChainDataTypes: props.hasHandle ? [langChainDataType] : [],
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
    export function String(props: {
        initialValue?: string;
        multiline?: boolean;
        hasHandle: boolean
    } & BaseProps): Foundations.Input.String {
        return {
            ...buildBase(props, "Text"),
            variant: "string",
            initialValue: props.initialValue ?? "",
            data: {
                multiline: props.multiline ?? false,
            }
        };
    }

    // ------------------------------------------
    // INTEGER
    // ------------------------------------------
    export function Integer(props: {
        initialValue?: number;
        min?: number;
        max?: number;
        step?: number;
        slider?: boolean;
        hasHandle: boolean
    } & BaseProps): Foundations.Input.Integer {
        return {
            ...buildBase(props, "Data"),
            variant: "integer",
            initialValue: props.initialValue ?? 0,
            data: {
                min: props.min,
                max: props.max,
                step: props.step ?? 1,
                slider: props.slider,
            }
        };
    }

    // ------------------------------------------
    // FLOAT
    // ------------------------------------------
    export function Float(props: {
        initialValue?: number;
        min?: number;
        max?: number;
        step?: number;
        slider?: boolean;
        hasHandle: boolean
    } & BaseProps): Foundations.Input.Float {
        return {
            ...buildBase(props, "Data"),
            variant: "float",
            initialValue: props.initialValue ?? 0.0,
            data: {
                min: props.min,
                max: props.max,
                step: props.step ?? 0.1,
                slider: props.slider,
            }
        };
    }

    // ------------------------------------------
    // BOOLEAN
    // ------------------------------------------
    export function Boolean(props: {
        initialValue?: boolean;
    } & BaseProps): Foundations.Input.Boolean {
        return {
            ...buildBase(props, "Data"),
            variant: "boolean",
            initialValue: props.initialValue ?? false,
        };
    }

    // ------------------------------------------
    // MULTI OPTION (Dropdown/Select/Tab)
    // ------------------------------------------
    export function MultiOption(props: {
        initialValue: string;
        options: string[];
        variant?: "select" | "tab";
    } & BaseProps): Foundations.Input.MultiOption {
        return {
            ...buildBase(props, "Text"),
            variant: "multiOption",
            initialValue: props.initialValue,
            data: {
                options: props.options,
                variant: props.variant ?? "select",
            }
        };
    }

    // ------------------------------------------
    // FILE
    // ------------------------------------------
    export function File(props: {
        initialValue?: string;
        fileTypes?: string[];
        hasHandle: boolean
    } & BaseProps): Foundations.Input.File {
        return {
            ...buildBase(props, "Data"),
            variant: "file",
            initialValue: props.initialValue ?? "",
            data: {
                fileTypes: props.fileTypes,
            }
        };
    }

    // ------------------------------------------
    // LIST
    // ------------------------------------------
    export function List(props: {
        initialValue?: string[];
        hasHandle: boolean
    } & BaseProps): Foundations.Input.List {
        return {
            ...buildBase(props, "Data"),
            variant: "list",
            initialValue: props.initialValue ?? [],
        };
    }

    // ------------------------------------------
    // JSON
    // ------------------------------------------
    export function Json(props: {
        initialValue?: any;
        hasHandle: boolean
    } & BaseProps): Foundations.Input.Json {
        return {
            ...buildBase(props, "Data"),
            variant: "json",
            initialValue: props.initialValue ?? {},
        };
    }

    // ------------------------------------------
    // SECRET (Password)
    // ------------------------------------------
    export function Secret(props: {
        initialValue?: string;
    } & BaseProps): Foundations.Input.Secret {
        return {
            ...buildBase(props, "Text"),
            variant: "secret",
            initialValue: props.initialValue ?? "",
        };
    }

    // ------------------------------------------
    // SCRIPT / CODE
    // ------------------------------------------
    export function Script(props: {
        initialValue?: string;
    } & BaseProps): Foundations.Input.Script {
        return {
            ...buildBase(props, "Text"),
            variant: "script",
            initialValue: props.initialValue ?? "",
        };
    }

    // ------------------------------------------
    // MESSAGE (LangChain Message Handle - Always has handle)
    // ------------------------------------------
    export function Message(props: Omit<BaseProps, "hasHandle">): Foundations.Input.String {
        return {
            ...buildBase({ ...props, hasHandle: true }, "Message"),
            variant: "string",
            initialValue: "",
            data: { multiline: false }
        };
    }

    // ------------------------------------------
    // LANGUAGE MODEL (LLM Handle - Always has handle)
    // ------------------------------------------
    export function LanguageModel(props: Omit<BaseProps, "hasHandle">): Foundations.Input.String {
        return {
            ...buildBase({ ...props, hasHandle: true }, "LanguageModel"),
            variant: "string",
            initialValue: "",
            data: { multiline: false }
        };
    }

    // ------------------------------------------
    // DOCUMENT (RAG Handle - Always has handle)
    // ------------------------------------------
    export function Document(props: Omit<BaseProps, "hasHandle">): Foundations.Input.String {
        return {
            ...buildBase({ ...props, hasHandle: true }, "Document"),
            variant: "string",
            initialValue: "",
            data: { multiline: false }
        };
    }

    // ------------------------------------------
    // RETRIEVER (RAG Handle - Always has handle)
    // ------------------------------------------
    export function Retriever(props: Omit<BaseProps, "hasHandle">): Foundations.Input.String {
        return {
            ...buildBase({ ...props, hasHandle: true }, "Retriever"),
            variant: "string",
            initialValue: "",
            data: { multiline: false }
        };
    }

    export function Structure(props: BaseProps): Foundations.Input.Structure {
        return {
            ...buildBase(props, "Structure"),
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
        dataType: Foundations.LangChainDataType
    ): Foundations.Output {
        return {
            id: "" as Foundations.Output.Id, // Will be assigned by transform layer
            langChainDataTypes: [dataType],
            asTool: false,
            uiData: {
                displayName: props.displayName,
            }
        };
    }

    // ------------------------------------------
    // TEXT OUTPUT
    // ------------------------------------------
    export function Text(props: BaseProps): Foundations.Output {
        return buildBase(props, "Text");
    }

    // ------------------------------------------
    // MESSAGE OUTPUT
    // ------------------------------------------
    export function Message(props: BaseProps): Foundations.Output {
        return buildBase(props, "Message");
    }

    // ------------------------------------------
    // LANGUAGE MODEL OUTPUT
    // ------------------------------------------
    export function LanguageModel(props: BaseProps): Foundations.Output {
        return buildBase(props, "LanguageModel");
    }

    // ------------------------------------------
    // DOCUMENT OUTPUT
    // ------------------------------------------
    export function Document(props: BaseProps): Foundations.Output {
        return buildBase(props, "Document");
    }

    // ------------------------------------------
    // RETRIEVER OUTPUT
    // ------------------------------------------
    export function Retriever(props: BaseProps): Foundations.Output {
        return buildBase(props, "Retriever");
    }

    // ------------------------------------------
    // EMBEDDINGS OUTPUT
    // ------------------------------------------
    export function Embeddings(props: BaseProps): Foundations.Output {
        return buildBase(props, "Embeddings");
    }

    // ------------------------------------------
    // VECTOR STORE OUTPUT
    // ------------------------------------------
    export function VectorStore(props: BaseProps): Foundations.Output {
        return buildBase(props, "VectorStore");
    }

    // ------------------------------------------
    // TOOL OUTPUT
    // ------------------------------------------
    export function Tool(props: BaseProps): Foundations.Output {
        return {
            ...buildBase(props, "Tool"),
            asTool: true,
        };
    }

    // ------------------------------------------
    // CHAIN / RUNNABLE OUTPUT
    // ------------------------------------------
    export function Chain(props: BaseProps): Foundations.Output {
        return buildBase(props, "Chain");
    }

    // ------------------------------------------
    // DATA (Generic Object)
    // ------------------------------------------
    export function Data(props: BaseProps): Foundations.Output {
        return buildBase(props, "Data");
    }
}