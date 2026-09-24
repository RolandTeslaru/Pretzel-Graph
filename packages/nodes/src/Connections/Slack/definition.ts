import { defineConnection } from "@pretzel-graph/node-sdk";
import { SlackBot } from "@pretzel-graph/nodes/Credentials";
import { Slack } from "@pretzel-graph/nodes/Integrations/Slack/domain";

// Which events arrive is set by the Slack app's event subscriptions, so the connection has no fields of its own.
export const Definition = defineConnection({
    id: "Connections.Slack",
    provider: Slack.PROVIDER,
    displayName: "Slack",
    description: "Listens to a Slack app's events, commands and interactions.",
    icon: "Slack",
    fields: [],
    credentials: [SlackBot],
})
