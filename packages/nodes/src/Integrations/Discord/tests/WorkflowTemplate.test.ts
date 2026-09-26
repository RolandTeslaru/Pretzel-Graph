import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { Foundations } from "@pretzel-graph/shared/domain";
import { ClipboardPayloadSchema } from "@pretzel-graph/shared/domain/Workbench/Document";

import { Blueprint as EventsBlueprint } from "../Events/blueprint";
import { Blueprint as OperationBlueprint } from "../Operation/blueprint";


const templatePath = new URL("../../../../../../examples/workflows/discord-dm-autoreply.json", import.meta.url);
const template = ClipboardPayloadSchema.parse(JSON.parse(readFileSync(templatePath, "utf8")));

const nodeById = (id: string) => {
    const node = template.nodes.find(candidate => candidate.id === id);

    assert.ok(node, `Template node ${id} is missing`);
    return node;
};


describe("Discord DM auto-reply workflow template", () => {
    it("is an importable clipboard payload with one connected event flow", () => {
        assert.equal(template.nodes.length, 2);
        assert.deepEqual(template.edges, [{
            id: "discord-events|event|discord-reply|event",
            source: { nodeId: "discord-events", portId: "event" },
            target: { nodeId: "discord-reply", portId: "event" },
        }]);
    });

    it("pins the editor shapes selected by its static values", () => {
        const events = nodeById("discord-events");
        const reply = nodeById("discord-reply");

        assert.equal(
            events.reconciledBlueprintId,
            Foundations.Blueprint.deriveId(EventsBlueprint, template.staticValues[events.id]),
        );
        assert.equal(
            reply.reconciledBlueprintId,
            Foundations.Blueprint.deriveId(OperationBlueprint, template.staticValues[reply.id]),
        );
    });

    it("evaluates reply content and Discord ids from the incoming event", () => {
        const reply = nodeById("discord-reply");
        const replyValues = template.staticValues[reply.id];

        assert.deepEqual(template.fieldExpressions[reply.id], {
            send_content: true,
            send_channel_id: true,
            send_reply_to_id: true,
        });
        assert.equal(replyValues["send_channel_id" as Foundations.Field.Id], "$in.event.channelId");
        assert.equal(replyValues["send_reply_to_id" as Foundations.Field.Id], "$in.event.messageId");
    });
});
