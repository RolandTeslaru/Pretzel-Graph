import { z } from "zod"

// ============================================
// PROJECTIONS
// ============================================
// Plain-object shapes projected from LC class instances.
// Used for frontend data preview and routing expression evaluation.
// The projected shape matches instance property access paths,
// NOT the LC serialization format.

export namespace Projection {

    export const Message = z.object({
        type:              z.string(),
        content:           z.union([z.string(), z.array(z.record(z.string(), z.any()))]),
        name:              z.string().optional(),
        id:                z.string().optional(),
        additional_kwargs: z.record(z.string(), z.any()),
        response_metadata: z.record(z.string(), z.any()),
        tool_calls:        z.array(z.record(z.string(), z.any())).optional(),
        invalid_tool_calls:z.array(z.record(z.string(), z.any())).optional(),
        usage_metadata:    z.record(z.string(), z.any()).optional(),
        tool_call_id:      z.string().optional(),
    })
    export type Message = z.infer<typeof Message>

    export const MessageList = z.array(Message)
    export type MessageList = z.infer<typeof MessageList>

    export const Retriever = z.object({
    })
    export type Retriever = z.infer<typeof Retriever>

    export const Document = z.object({
        pageContent: z.string(),
        metadata:    z.record(z.string(), z.any()),
    })
    export type Document = z.infer<typeof Document>

    export const Tool = z.object({
        name:        z.string(),
        description: z.string(),
        returnDirect: z.boolean(),
    })
    export type Tool = z.infer<typeof Tool>

    export const ToolList = z.array(Tool)
    export type ToolList = z.infer<typeof ToolList>

    export const LanguageModel = z.object({
        type:             z.string(),
        model:            z.string(),
        temperature:      z.number().optional(),
        streaming:        z.boolean().optional(),
        topP:             z.number().optional(),
        topK:             z.number().optional(),
        maxTokens:        z.number().optional(),
        maxOutputTokens:  z.number().optional(),
        stop:             z.array(z.string()).optional(),
        stopSequences:    z.array(z.string()).optional(),
        frequencyPenalty: z.number().optional(),
        presencePenalty:  z.number().optional(),
        n:                z.number().optional(),
        modelKwargs:      z.record(z.string(), z.any()).optional(),
    })
    export type LanguageModel = z.infer<typeof LanguageModel>

    export const Embeddings = z.object({
        model:         z.string(),
        dimensions:    z.number().optional(),
        batchSize:     z.number().optional(),
        stripNewLines: z.boolean().optional(),
        maxBatchSize:  z.number().optional(),
    })
    export type Embeddings = z.infer<typeof Embeddings>

    // Data ports project their value through as-is (see Synthesizer.project); they aren't LC
    // instances, so they need permissive shapes. The two mirror the port variants:
    //   Data     = a single item — a plain object (Data / Json) or a scalar (Text / Integer)
    //   DataList = an array of items (DataList)
    export const Data = z.union([
        z.record(z.string(), z.any()),
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
    ])
    export type Data = z.infer<typeof Data>

    export const DataList = z.array(Data)
    export type DataList = z.infer<typeof DataList>

    export const Schema = z.union([
        Message,
        MessageList,
        Document,
        Tool,
        ToolList,
        LanguageModel,
        Embeddings,
        Retriever,     // z.object({}) — opaque handle for VectorStore / Retriever
        Data,          // a single item: object or scalar
        DataList,      // an array of items
        z.undefined()
    ])
}
export type Projection = z.infer<typeof Projection.Schema>
