"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chat = void 0;
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const Workflow_1 = require("./Workflow");
const Realtime_1 = require("./Realtime");
const zod_utils_1 = require("./zod-utils");
var Chat;
(function (Chat) {
    Chat.Id = zod_1.z.uuid().brand("ChatId");
    function createId() {
        return crypto.randomUUID();
    }
    Chat.createId = createId;
    let Attachment;
    (function (Attachment) {
        Attachment.Id = zod_1.z.string().brand("AttachmentId");
        Attachment.Schema = zod_1.z.object({
            id: Attachment.Id,
            url: zod_1.z.string(),
            name: zod_1.z.string(),
            mime_type: zod_1.z.string(),
            size_bytes: zod_1.z.number(),
            storage_path: zod_1.z.string(),
            uploaded_at: zod_utils_1.supabaseTimestamp
        });
    })(Attachment = Chat.Attachment || (Chat.Attachment = {}));
    let ToolCall;
    (function (ToolCall) {
        ToolCall.Id = zod_1.z.string().brand("ToolCallId");
        ToolCall.Schema = zod_1.z.object({
            id: ToolCall.Id,
            name: zod_1.z.string(),
            arguments: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
        });
        ToolCall.Invalid = zod_1.z.object({
            id: zod_1.z.string().nullish(),
            name: zod_1.z.string().nullish(),
            args: zod_1.z.string().nullish(),
            error: zod_1.z.string().nullish(),
        });
        ToolCall.Status = zod_1.z.enum(["success", "error"]);
    })(ToolCall = Chat.ToolCall || (Chat.ToolCall = {}));
    Chat.UsageMetadata = zod_1.z.object({
        input_tokens: zod_1.z.number(),
        output_tokens: zod_1.z.number(),
        total_tokens: zod_1.z.number(),
        input_token_details: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).optional(),
        output_token_details: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).optional(),
    }).loose();
    let Message;
    (function (Message) {
        Message.Id = zod_1.z.uuid().brand("MessageId");
        // v7, not v4: ids are the sort key for message order. A batch is written in one
        // insert where every row shares `created_at`, so only the id can recover sequence.
        function createId() {
            return (0, uuid_1.v7)();
        }
        Message.createId = createId;
        Message.Role = zod_1.z.enum(["human", "ai", "tool", "system"]);
        Message.Base = zod_1.z.object({
            id: Message.Id,
            content: zod_1.z.string(),
            attachments: zod_1.z.record(Attachment.Id, Attachment.Schema).nullish(),
        });
        function configLiteral(value) {
            return zod_1.z.literal(value);
        }
        // Fields common to every LangChain BaseMessage (content lives on Base).
        const LcMeta = {
            name: zod_1.z.string().nullish(),
            lc_id: zod_1.z.string().nullish(),
            additional_kwargs: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).nullish(),
            response_metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).nullish(),
        };
        Message.Human = Message.Base.extend({
            role: configLiteral("human"),
            data: zod_1.z.object({ ...LcMeta }).optional(),
        });
        Message.AI = Message.Base.extend({
            role: configLiteral("ai"),
            data: zod_1.z.object({
                isProcessing: zod_1.z.boolean(),
                tool_calls: zod_1.z.array(ToolCall.Schema).optional(),
                invalid_tool_calls: zod_1.z.array(ToolCall.Invalid).optional(),
                usage_metadata: Chat.UsageMetadata.nullish(),
                ...LcMeta,
            }),
        });
        Message.Tool = Message.Base.extend({
            role: configLiteral("tool"),
            data: zod_1.z.object({
                tool_call_id: ToolCall.Id,
                tool_name: zod_1.z.string(),
                status: ToolCall.Status,
                error: zod_1.z.string().optional(),
                artifact: zod_1.z.unknown().nullish(),
                ...LcMeta,
            }),
        });
        Message.System = Message.Base.extend({
            role: configLiteral("system"),
            data: zod_1.z.object({ ...LcMeta }).optional(),
        });
        Message.Schema = zod_1.z.discriminatedUnion("role", [
            Message.Human,
            Message.AI,
            Message.Tool,
            Message.System,
        ]);
    })(Message = Chat.Message || (Chat.Message = {}));
    Chat.Schema = zod_1.z.object({
        id: Chat.Id,
        name: zod_1.z.string(),
        workflow_id: Workflow_1.Workflow.Id,
        created_at: zod_utils_1.supabaseTimestamp,
        updated_at: zod_utils_1.supabaseTimestamp,
    });
    let Event;
    (function (Event) {
        Event.Channel = Realtime_1.Realtime.Channel.brand("ChatChannel");
        function getChannel(chatId) {
            return `chat:${chatId}`;
        }
        Event.getChannel = getChannel;
        const Base = Realtime_1.Realtime.Event.Base.extend({
            chatId: Chat.Id,
        });
        let Message;
        (function (Message) {
            let Added;
            (function (Added) {
                Added.Schema = Base.extend({
                    type: zod_1.z.literal("message:added"),
                    messages: zod_1.z.array(Chat.Message.Schema),
                });
            })(Added = Message.Added || (Message.Added = {}));
            let Updated;
            (function (Updated) {
                Updated.Schema = Base.extend({
                    type: zod_1.z.literal("message:updated"),
                    message: Chat.Message,
                });
            })(Updated = Message.Updated || (Message.Updated = {}));
            let Erased;
            (function (Erased) {
                Erased.Schema = Base.extend({
                    type: zod_1.z.literal("message:erased"),
                    messageId: Chat.Message.Id,
                });
            })(Erased = Message.Erased || (Message.Erased = {}));
        })(Message = Event.Message || (Event.Message = {}));
        Event.Schema = zod_1.z.discriminatedUnion("type", [
            Message.Added.Schema,
            Message.Updated.Schema,
            Message.Erased.Schema,
        ]);
    })(Event = Chat.Event || (Chat.Event = {}));
    let API;
    (function (API) {
        let Message;
        (function (Message) {
            let Add;
            (function (Add) {
                Add.Request = zod_1.z.lazy(() => zod_1.z.strictObject({
                    messages: zod_1.z.array(Chat.Message.Schema),
                }));
                Add.Response = zod_1.z.object({});
            })(Add = Message.Add || (Message.Add = {}));
            async function add(api, chatId, req) {
                const { data } = await api.post(`/api/chat/${chatId}/message/add`, req);
                return data;
            }
            Message.add = add;
            let Update;
            (function (Update) {
                Update.Request = zod_1.z.object({
                    messageId: Chat.Message.Id,
                    content: zod_1.z.string(),
                });
                Update.Response = zod_1.z.object({});
            })(Update = Message.Update || (Message.Update = {}));
            async function update(api, req) {
                const { data } = await api.post("/api/chat/message/update", req);
                return data;
            }
            Message.update = update;
            let Erase;
            (function (Erase) {
                Erase.Request = zod_1.z.object({
                    messageId: Chat.Message.Id,
                });
                Erase.Response = zod_1.z.object({});
            })(Erase = Message.Erase || (Message.Erase = {}));
            async function erase(api, req) {
                const { data } = await api.post("/api/chat/message/erase", req);
                return data;
            }
            Message.erase = erase;
            let StreamOutput;
            (function (StreamOutput) {
                StreamOutput.Request = zod_1.z.object({
                    chatId: Chat.Id,
                    jobId: zod_1.z.string().brand("JobId")
                });
            })(StreamOutput = Message.StreamOutput || (Message.StreamOutput = {}));
            async function streamOutput(auth, api_base_url, req) {
                const { data } = await auth.getSession();
                const token = data.session?.access_token;
                if (!token)
                    throw new Error("No token found");
                const response = await fetch(`${api_base_url}/api/chat/message/streamOutput`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(req)
                });
                return response;
            }
            Message.streamOutput = streamOutput;
            let StreamResponse;
            (function (StreamResponse) {
                StreamResponse.Request = zod_1.z.object({
                    responseMessage: Chat.Message.AI,
                    jobId: zod_1.z.string().brand("JobId")
                });
            })(StreamResponse = Message.StreamResponse || (Message.StreamResponse = {}));
            async function streamResponse(auth, api_base_url, req) {
                const { data } = await auth.getSession();
                const token = data.session?.access_token;
                if (!token)
                    throw new Error("No token found");
                const response = await fetch(`${api_base_url}/api/chat/message/streamResponse`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(req)
                });
                return response;
            }
            Message.streamResponse = streamResponse;
        })(Message = API.Message || (API.Message = {}));
        // The chat was the entire request, and it is now the entire path.
        let Erase;
        (function (Erase) {
            Erase.Response = zod_1.z.object({});
        })(Erase = API.Erase || (API.Erase = {}));
        async function erase(api, chatId) {
            const { data } = await api.post(`/api/chat/${chatId}/erase`, {});
            return data;
        }
        API.erase = erase;
        // The workflow the chat hangs off is the authorization boundary, so it travels in the
        // path and the route's scope guard proves ownership before the handler runs.
        let Create;
        (function (Create) {
            Create.Request = zod_1.z.strictObject({
                name: zod_1.z.string().optional(),
            });
            Create.Response = zod_1.z.object({
                chat: Chat.Schema
            });
        })(Create = API.Create || (API.Create = {}));
        async function create(api, workflow_id, req) {
            const { data } = await api.post(`/api/chat/${workflow_id}/create`, req);
            return data;
        }
        API.create = create;
        // chatId stays in the body because it is a proposal, not a claim: the row may not exist
        // yet, so there is nothing to authorize against. The workflow it hangs off is the
        // authorization boundary and travels in the path.
        let Ensure;
        (function (Ensure) {
            Ensure.Request = zod_1.z.strictObject({
                chatId: Chat.Id,
                name: zod_1.z.string().optional(),
            });
            Ensure.Response = zod_1.z.object({
                chat: Chat.Schema
            });
        })(Ensure = API.Ensure || (API.Ensure = {}));
        async function ensure(api, workflow_id, req) {
            const { data } = await api.post(`/api/chat/${workflow_id}/ensure`, req);
            return data;
        }
        API.ensure = ensure;
        let Get;
        (function (Get) {
            Get.Request = zod_1.z.strictObject({
                cursor: Chat.Message.Id.optional(),
                limit: zod_1.z.number().int().positive().default(50).optional(),
            });
            Get.Response = zod_1.z.object({
                chat: Chat.Schema,
                messages: zod_1.z.array(Chat.Message.Schema),
            });
        })(Get = API.Get || (API.Get = {}));
        async function get(api, chatId, req = {}) {
            const { data } = await api.post(`/api/chat/${chatId}/get`, req);
            return data;
        }
        API.get = get;
        let List;
        (function (List) {
            List.Request = zod_1.z.object({});
            List.Response = zod_1.z.object({
                chats: zod_1.z.array(Chat.Schema),
            });
        })(List = API.List || (API.List = {}));
        async function list(api, req) {
            const { data } = await api.post("/api/chat/list", req);
            return data;
        }
        API.list = list;
        // The workflow was the entire request, and it is now the entire path — so there is no
        // body left to describe.
        let ListByWorkflow;
        (function (ListByWorkflow) {
            ListByWorkflow.Response = zod_1.z.object({
                chats: zod_1.z.array(Chat.Schema),
            });
        })(ListByWorkflow = API.ListByWorkflow || (API.ListByWorkflow = {}));
        async function listByWorkflow(api, workflow_id) {
            const { data } = await api.post(`/api/chat/${workflow_id}/list`, {});
            return data;
        }
        API.listByWorkflow = listByWorkflow;
    })(API = Chat.API || (Chat.API = {}));
})(Chat || (exports.Chat = Chat = {}));
