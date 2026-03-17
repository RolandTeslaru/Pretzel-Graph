import { BaseMessage as CoreBaseMessage, HumanMessage as CoreHumanMessage, SystemMessage as CoreSystemMessage, AIMessage as CoreAIMessage } from "@langchain/core/messages";
import { BaseLanguageModel as CoreBaseLanguageModel } from "@langchain/core/language_models/base";
import { Embeddings as CoreEmbeddings } from "@langchain/core/embeddings";
import { VectorStore as CoreVectorStore } from "@langchain/core/vectorstores";
import { Tool as CoreTool } from "@langchain/core/tools";
import { Document as CoreDocument } from "@langchain/core/documents";
import { BaseRetriever as CoreBaseRetriever } from "@langchain/core/retrievers";

export namespace LC {
    export const BaseMessage = CoreBaseMessage;
    export const HumanMessage = CoreHumanMessage;
    export const SystemMessage = CoreSystemMessage;
    export const AIMessage = CoreAIMessage;
    export const BaseLanguageModel = CoreBaseLanguageModel;
    export const Embeddings = CoreEmbeddings;
    export const VectorStore = CoreVectorStore;
    export const Tool = CoreTool;
    export const Document = CoreDocument;
    export const BaseRetriever = CoreBaseRetriever;

    export type BaseMessage = CoreBaseMessage;
    export type HumanMessage = CoreHumanMessage;
    export type SystemMessage = CoreSystemMessage;
    export type AIMessage = CoreAIMessage;
    export type BaseLanguageModel = CoreBaseLanguageModel;
    export type Embeddings = CoreEmbeddings;
    export type VectorStore = CoreVectorStore;
    export type Tool = CoreTool;
    export type Document = CoreDocument;
    export type BaseRetriever = CoreBaseRetriever;
}