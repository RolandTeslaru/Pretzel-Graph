"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Assistant = void 0;
const zod_1 = require("zod");
const Workflow_1 = require("./Workflow");
const Realtime_1 = require("./Realtime");
const zod_utils_1 = require("./zod-utils");
const Auth_1 = require("./Auth");
const ExecutionId = zod_1.z.uuid().brand("ExecutionId");
var Assistant;
(function (Assistant_1) {
    Assistant_1.Id = zod_1.z.uuid().brand("AssistantId");
    function createId() {
        return crypto.randomUUID();
    }
    Assistant_1.createId = createId;
    let Attachment;
    (function (Attachment) {
        Attachment.Id = zod_1.z.string().brand("AssistantAttachmentId");
        Attachment.Schema = zod_1.z.object({
            id: Attachment.Id,
            url: zod_1.z.string(),
            name: zod_1.z.string(),
            mime_type: zod_1.z.string(),
            size_bytes: zod_1.z.number(),
            storage_path: zod_1.z.string(),
            uploaded_at: zod_utils_1.supabaseTimestamp
        });
    })(Attachment = Assistant_1.Attachment || (Assistant_1.Attachment = {}));
    let ToolCall;
    (function (ToolCall) {
        ToolCall.Id = zod_1.z.string().brand("AssistantToolCallId");
        ToolCall.Schema = zod_1.z.object({
            id: ToolCall.Id,
            name: zod_1.z.string(),
            arguments: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
        });
        ToolCall.Status = zod_1.z.enum(["success", "error"]);
    })(ToolCall = Assistant_1.ToolCall || (Assistant_1.ToolCall = {}));
    let Message;
    (function (Message) {
        Message.Id = zod_1.z.uuid().brand("AssistantMessageId");
        function createId() {
            return crypto.randomUUID();
        }
        Message.createId = createId;
        Message.Role = zod_1.z.enum(["human", "ai", "tool", "system"]);
        Message.Base = zod_1.z.object({
            id: Message.Id,
            content: zod_1.z.string(),
            assistant_id: Assistant.Id,
            created_at: zod_utils_1.supabaseTimestamp,
            updated_at: zod_utils_1.supabaseTimestamp.nullish(),
            attachments: zod_1.z.record(Attachment.Id, Attachment.Schema).nullish(),
        });
        function configLiteral(value) {
            return zod_1.z.literal(value);
        }
        Message.Human = Message.Base.extend({
            role: configLiteral("human"),
            data: zod_1.z.object({}).optional(),
        });
        Message.AI = Message.Base.extend({
            role: configLiteral("ai"),
            data: zod_1.z.object({
                isProcessing: zod_1.z.boolean(),
                tool_calls: zod_1.z.array(ToolCall.Schema).optional(),
            }),
        });
        Message.Tool = Message.Base.extend({
            role: configLiteral("tool"),
            data: zod_1.z.object({
                tool_call_id: ToolCall.Id,
                tool_name: zod_1.z.string(),
                status: ToolCall.Status,
                error: zod_1.z.string().optional(),
            }),
        });
        Message.System = Message.Base.extend({
            role: configLiteral("system"),
            data: zod_1.z.object({}).optional(),
        });
        Message.Schema = zod_1.z.discriminatedUnion("role", [
            Message.Human,
            Message.AI,
            Message.Tool,
            Message.System,
        ]);
    })(Message = Assistant_1.Message || (Assistant_1.Message = {}));
    Assistant_1.Schema = zod_1.z.object({
        id: Assistant.Id,
        name: zod_1.z.string(),
        workflow_id: Workflow_1.Workflow.Id,
        created_at: zod_utils_1.supabaseTimestamp,
        updated_at: zod_utils_1.supabaseTimestamp,
    });
    let Event;
    (function (Event) {
        Event.Channel = Realtime_1.Realtime.Channel.brand("AssistantChannel");
        function getChannel(assistantId) {
            return `assistant:${assistantId}`;
        }
        Event.getChannel = getChannel;
        const Base = Realtime_1.Realtime.Event.Base.extend({
            assistantId: Assistant.Id,
        });
        let Message;
        (function (Message) {
            let Added;
            (function (Added) {
                Added.Schema = Base.extend({
                    type: zod_1.z.literal("message:added"),
                    messages: zod_1.z.array(Assistant.Message.Schema),
                });
            })(Added = Message.Added || (Message.Added = {}));
            let Updated;
            (function (Updated) {
                Updated.Schema = Base.extend({
                    type: zod_1.z.literal("message:updated"),
                    message: Assistant.Message,
                });
            })(Updated = Message.Updated || (Message.Updated = {}));
            let Erased;
            (function (Erased) {
                Erased.Schema = Base.extend({
                    type: zod_1.z.literal("message:erased"),
                    messageId: Assistant.Message.Id,
                });
            })(Erased = Message.Erased || (Message.Erased = {}));
        })(Message = Event.Message || (Event.Message = {}));
        Event.Schema = zod_1.z.discriminatedUnion("type", [
            Message.Added.Schema,
            Message.Updated.Schema,
            Message.Erased.Schema,
        ]);
    })(Event = Assistant_1.Event || (Assistant_1.Event = {}));
    let Database;
    (function (Database) {
        let Row;
        (function (Row) {
            Row.Assistant = Assistant_1.Schema.extend({
                created_by: Auth_1.Auth.User.Id.nullable(),
            });
        })(Row = Database.Row || (Database.Row = {}));
    })(Database = Assistant_1.Database || (Assistant_1.Database = {}));
    let Signal;
    (function (Signal) {
        let MessageSent;
        (function (MessageSent) {
            MessageSent.Channel = Realtime_1.Realtime.Channel.brand("Assistant.Signal.MessageSent.Channel");
            MessageSent.getChannel = (executionId) => `assistant:message_sent:${executionId}`;
            MessageSent.Schema = Realtime_1.Realtime.Signal.Base.extend({
                assistantId: Assistant.Id,
                message: Assistant.Message.Schema,
            });
        })(MessageSent = Signal.MessageSent || (Signal.MessageSent = {}));
        let HumanResponded;
        (function (HumanResponded) {
            HumanResponded.Channel = Realtime_1.Realtime.Channel.brand("Assistant.Signal.HumanResponded.Channel");
            HumanResponded.getChannel = (executionId) => `assistant:human_responded:${executionId}`;
            HumanResponded.Schema = Realtime_1.Realtime.Signal.Base.extend({
                assistantId: Assistant.Id,
                message: Assistant.Message.Human,
            });
        })(HumanResponded = Signal.HumanResponded || (Signal.HumanResponded = {}));
    })(Signal = Assistant_1.Signal || (Assistant_1.Signal = {}));
    let API;
    (function (API) {
        let Message;
        (function (Message) {
            let Add;
            (function (Add) {
                Add.Request = zod_1.z.lazy(() => zod_1.z.object({
                    messages: zod_1.z.array(Assistant.Message.Schema),
                }));
                Add.Response = zod_1.z.object({});
            })(Add = Message.Add || (Message.Add = {}));
            async function add(api, req) {
                const { data } = await api.post("/api/assistant/message/add", req);
                return data;
            }
            Message.add = add;
            let Update;
            (function (Update) {
                Update.Request = zod_1.z.object({
                    messageId: Assistant.Message.Id,
                    content: zod_1.z.string(),
                });
                Update.Response = zod_1.z.object({});
            })(Update = Message.Update || (Message.Update = {}));
            async function update(api, req) {
                const { data } = await api.post("/api/assistant/message/update", req);
                return data;
            }
            Message.update = update;
            let Erase;
            (function (Erase) {
                Erase.Request = zod_1.z.object({
                    messageId: Assistant.Message.Id,
                });
                Erase.Response = zod_1.z.object({});
            })(Erase = Message.Erase || (Message.Erase = {}));
            async function erase(api, req) {
                const { data } = await api.post("/api/assistant/message/erase", req);
                return data;
            }
            Message.erase = erase;
            let StreamOutput;
            (function (StreamOutput) {
                StreamOutput.Request = zod_1.z.object({
                    assistantId: Assistant.Id,
                    jobId: zod_1.z.string().brand("JobId")
                });
            })(StreamOutput = Message.StreamOutput || (Message.StreamOutput = {}));
            async function streamOutput(auth, api_base_url, req) {
                const { data } = await auth.getSession();
                const token = data.session?.access_token;
                if (!token)
                    throw new Error("No token found");
                const response = await fetch(`${api_base_url}/api/assistant/message/streamOutput`, {
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
                    responseMessage: Assistant.Message.AI,
                    jobId: zod_1.z.string().brand("JobId")
                });
            })(StreamResponse = Message.StreamResponse || (Message.StreamResponse = {}));
            async function streamResponse(auth, api_base_url, req) {
                const { data } = await auth.getSession();
                const token = data.session?.access_token;
                if (!token)
                    throw new Error("No token found");
                const response = await fetch(`${api_base_url}/api/assistant/message/streamResponse`, {
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
        let Erase;
        (function (Erase) {
            Erase.Request = zod_1.z.object({
                assistantId: Assistant.Id,
            });
            Erase.Response = zod_1.z.object({});
        })(Erase = API.Erase || (API.Erase = {}));
        async function erase(api, req) {
            const { data } = await api.post("/api/assistant/erase", req);
            return data;
        }
        API.erase = erase;
        let Create;
        (function (Create) {
            Create.Request = zod_1.z.object({
                workflow_id: Workflow_1.Workflow.Id,
                name: zod_1.z.string().optional(),
            });
            Create.Response = zod_1.z.object({
                assistant: Assistant.Schema
            });
        })(Create = API.Create || (API.Create = {}));
        async function create(api, req) {
            const { data } = await api.post("/api/assistant/create", req);
            return data;
        }
        API.create = create;
        let Ensure;
        (function (Ensure) {
            Ensure.Request = zod_1.z.object({
                assistantId: Assistant.Id,
                workflow_id: Workflow_1.Workflow.Id,
                name: zod_1.z.string().optional(),
            });
            Ensure.Response = zod_1.z.object({
                assistant: Assistant.Schema
            });
        })(Ensure = API.Ensure || (API.Ensure = {}));
        async function ensure(api, req) {
            const { data } = await api.post("/api/assistant/ensure", req);
            return data;
        }
        API.ensure = ensure;
        let Get;
        (function (Get) {
            Get.Request = zod_1.z.object({
                assistantId: Assistant.Id,
                cursor: Assistant.Message.Id.optional(),
                limit: zod_1.z.number().int().positive().default(50).optional(),
            });
            Get.Response = zod_1.z.object({
                assistant: Assistant.Schema,
                messages: zod_1.z.array(Assistant.Message.Schema),
            });
        })(Get = API.Get || (API.Get = {}));
        async function get(api, req) {
            const { data } = await api.post("/api/assistant/get", req);
            return data;
        }
        API.get = get;
        let List;
        (function (List) {
            List.Request = zod_1.z.object({});
            List.Response = zod_1.z.object({
                assistants: zod_1.z.array(Assistant.Schema),
            });
        })(List = API.List || (API.List = {}));
        async function list(api, req) {
            const { data } = await api.post("/api/assistant/list", req);
            return data;
        }
        API.list = list;
    })(API = Assistant_1.API || (Assistant_1.API = {}));
})(Assistant || (exports.Assistant = Assistant = {}));
