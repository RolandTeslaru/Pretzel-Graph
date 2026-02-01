import { Workflow } from "@vx-agent-builder/shared/types/Workflow";

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
        langChainDataType: Workflow.Node.LangChainDataType
    ): Omit<Workflow.Node.Input.Base, "variant" | "initialValue" | "data"> {
        return {
            id: "" as Workflow.Node.Input.Id, // Will be assigned by transform layer
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
    } & BaseProps): Workflow.Node.Input.String {
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
    } & BaseProps): Workflow.Node.Input.Integer {
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
    } & BaseProps): Workflow.Node.Input.Float {
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
    } & BaseProps): Workflow.Node.Input.Boolean {
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
    } & BaseProps): Workflow.Node.Input.MultiOption {
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
    } & BaseProps): Workflow.Node.Input.File {
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
    } & BaseProps): Workflow.Node.Input.List {
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
    } & BaseProps): Workflow.Node.Input.Json {
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
    } & BaseProps): Workflow.Node.Input.Secret {
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
    } & BaseProps): Workflow.Node.Input.Script {
        return {
            ...buildBase(props, "Text"),
            variant: "script",
            initialValue: props.initialValue ?? "",
        };
    }

    // ------------------------------------------
    // MESSAGE (LangChain Message Handle - Always has handle)
    // ------------------------------------------
    export function Message(props: Omit<BaseProps, "hasHandle">): Workflow.Node.Input.String {
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
    export function LanguageModel(props: Omit<BaseProps, "hasHandle">): Workflow.Node.Input.String {
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
    export function Document(props: Omit<BaseProps, "hasHandle">): Workflow.Node.Input.String {
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
    export function Retriever(props: Omit<BaseProps, "hasHandle">): Workflow.Node.Input.String {
        return {
            ...buildBase({ ...props, hasHandle: true }, "Retriever"),
            variant: "string",
            initialValue: "",
            data: { multiline: false }
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
        dataType: Workflow.Node.LangChainDataType
    ): Workflow.Node.Output {
        return {
            id: "" as Workflow.Node.Output.Id, // Will be assigned by transform layer
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
    export function Text(props: BaseProps): Workflow.Node.Output {
        return buildBase(props, "Text");
    }

    // ------------------------------------------
    // MESSAGE OUTPUT
    // ------------------------------------------
    export function Message(props: BaseProps): Workflow.Node.Output {
        return buildBase(props, "Message");
    }

    // ------------------------------------------
    // LANGUAGE MODEL OUTPUT
    // ------------------------------------------
    export function LanguageModel(props: BaseProps): Workflow.Node.Output {
        return buildBase(props, "LanguageModel");
    }

    // ------------------------------------------
    // DOCUMENT OUTPUT
    // ------------------------------------------
    export function Document(props: BaseProps): Workflow.Node.Output {
        return buildBase(props, "Document");
    }

    // ------------------------------------------
    // RETRIEVER OUTPUT
    // ------------------------------------------
    export function Retriever(props: BaseProps): Workflow.Node.Output {
        return buildBase(props, "Retriever");
    }

    // ------------------------------------------
    // EMBEDDINGS OUTPUT
    // ------------------------------------------
    export function Embeddings(props: BaseProps): Workflow.Node.Output {
        return buildBase(props, "Embeddings");
    }

    // ------------------------------------------
    // VECTOR STORE OUTPUT
    // ------------------------------------------
    export function VectorStore(props: BaseProps): Workflow.Node.Output {
        return buildBase(props, "VectorStore");
    }

    // ------------------------------------------
    // TOOL OUTPUT
    // ------------------------------------------
    export function Tool(props: BaseProps): Workflow.Node.Output {
        return {
            ...buildBase(props, "Tool"),
            asTool: true,
        };
    }

    // ------------------------------------------
    // CHAIN / RUNNABLE OUTPUT
    // ------------------------------------------
    export function Chain(props: BaseProps): Workflow.Node.Output {
        return buildBase(props, "Chain");
    }

    // ------------------------------------------
    // DATA (Generic Object)
    // ------------------------------------------
    export function Data(props: BaseProps): Workflow.Node.Output {
        return buildBase(props, "Data");
    }
}