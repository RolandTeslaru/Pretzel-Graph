"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Projection = void 0;
const zod_1 = require("zod");
// ============================================
// PROJECTIONS
// ============================================
// Plain-object shapes projected from LC class instances.
// Used for frontend data preview and routing expression evaluation.
// The projected shape matches instance property access paths,
// NOT the LC serialization format.
var Projection;
(function (Projection) {
    Projection.Message = zod_1.z.object({
        type: zod_1.z.string(),
        content: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.any()))]),
        name: zod_1.z.string().optional(),
        id: zod_1.z.string().optional(),
        additional_kwargs: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
        response_metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
        tool_calls: zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.any())).optional(),
        invalid_tool_calls: zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.any())).optional(),
        usage_metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
        tool_call_id: zod_1.z.string().optional(),
    });
    Projection.MessageList = zod_1.z.array(Projection.Message);
    Projection.Retriever = zod_1.z.object({});
    Projection.Document = zod_1.z.object({
        pageContent: zod_1.z.string(),
        metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    });
    Projection.Tool = zod_1.z.object({
        name: zod_1.z.string(),
        description: zod_1.z.string(),
        returnDirect: zod_1.z.boolean(),
    });
    Projection.ToolList = zod_1.z.array(Projection.Tool);
    Projection.LanguageModel = zod_1.z.object({
        type: zod_1.z.string(),
        model: zod_1.z.string(),
        temperature: zod_1.z.number().optional(),
        streaming: zod_1.z.boolean().optional(),
        topP: zod_1.z.number().optional(),
        topK: zod_1.z.number().optional(),
        maxTokens: zod_1.z.number().optional(),
        maxOutputTokens: zod_1.z.number().optional(),
        stop: zod_1.z.array(zod_1.z.string()).optional(),
        stopSequences: zod_1.z.array(zod_1.z.string()).optional(),
        frequencyPenalty: zod_1.z.number().optional(),
        presencePenalty: zod_1.z.number().optional(),
        n: zod_1.z.number().optional(),
        modelKwargs: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    });
    Projection.Embeddings = zod_1.z.object({
        model: zod_1.z.string(),
        dimensions: zod_1.z.number().optional(),
        batchSize: zod_1.z.number().optional(),
        stripNewLines: zod_1.z.boolean().optional(),
        maxBatchSize: zod_1.z.number().optional(),
    });
    // Data ports project their value through as-is (see Synthesizer.project); they aren't LC
    // instances, so they need permissive shapes. The two mirror the port variants:
    //   Data     = a single item — a plain object (Data / Json) or a scalar (Text / Integer)
    //   DataList = an array of items (DataList)
    Projection.Data = zod_1.z.union([
        zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
        zod_1.z.string(),
        zod_1.z.number(),
        zod_1.z.boolean(),
        zod_1.z.null(),
    ]);
    Projection.DataList = zod_1.z.array(Projection.Data);
    Projection.Schema = zod_1.z.union([
        Projection.Message,
        Projection.MessageList,
        Projection.Document,
        Projection.Tool,
        Projection.ToolList,
        Projection.LanguageModel,
        Projection.Embeddings,
        Projection.Retriever, // z.object({}) — opaque handle for VectorStore / Retriever
        Projection.Data, // a single item: object or scalar
        Projection.DataList, // an array of items
        zod_1.z.undefined()
    ]);
})(Projection || (exports.Projection = Projection = {}));
