import { BaseMessage as _BaseMessage, HumanMessage as _HumanMessage, SystemMessage as _SystemMessage, AIMessage as _AIMessage, AIMessageChunk as _AIMessageChunk, ToolMessage as _ToolMessage } from "@langchain/core/messages";
import { BaseLanguageModel as _BaseLanguageModel } from "@langchain/core/language_models/base";
import { BaseChatModel     as _BaseChatModel     } from "@langchain/core/language_models/chat_models";
import { Embeddings        as _Embeddings        } from "@langchain/core/embeddings";
import { VectorStore       as _VectorStore       } from "@langchain/core/vectorstores";
import { StructuredTool    as _Tool              } from "@langchain/core/tools";
import { Document          as _Document          } from "@langchain/core/documents";
import { BaseRetriever     as _BaseRetriever     } from "@langchain/core/retrievers";

export namespace LC {
    export const BaseMessage       = _BaseMessage;
    export const HumanMessage      = _HumanMessage;
    export const SystemMessage     = _SystemMessage;
    export const AIMessage         = _AIMessage;
    export const AIMessageChunk    = _AIMessageChunk;
    export const ToolMessage       = _ToolMessage;
    export const BaseLanguageModel = _BaseLanguageModel;
    export const BaseChatModel     = _BaseChatModel;
    export const Embeddings        = _Embeddings;
    export const VectorStore       = _VectorStore;
    export const Tool              = _Tool;
    export const Document          = _Document;
    export const BaseRetriever     = _BaseRetriever;

    export type BaseMessage        = _BaseMessage;
    export type HumanMessage       = _HumanMessage;
    export type SystemMessage      = _SystemMessage;
    export type AIMessage          = _AIMessage;
    export type AIMessageChunk     = _AIMessageChunk;
    export type ToolMessage        = _ToolMessage;
    export type BaseLanguageModel  = _BaseLanguageModel;
    export type BaseChatModel      = _BaseChatModel;
    export type Embeddings         = _Embeddings;
    export type VectorStore        = _VectorStore;
    export type Tool               = _Tool;
    export type Document           = _Document;
    export type BaseRetriever      = _BaseRetriever;
}
