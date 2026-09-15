import type { Dependency } from "@pretzel-graph/shared/domain";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";

import { Blueprint } from "./blueprint";

type SkillRef = Dependency.Ref.Skill
type Skill    = Dependency.Value.Skill

const PREAMBLE = "Loads the full instructions for a skill. Call it before starting a task that matches one of these skills:";

export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ) {
        const fields = this.fieldValues;
        const refs   = uniqueById(incoming.skills ?? []);

        if (refs.length === 0)
            throw new Error("Load Skill needs at least one connected skill");

        const skills = refs.map(ref => this.context.dependencyAPI.get(ref));

        if (fields.isConvertedToTool === true)
            return { tool: buildTool(skills) } satisfies InferOutputs<typeof Blueprint, typeof fields>;

        const instructions = skills.map(({ name, description, content }) => ({ name, description, content }));

        return { instructions } satisfies InferOutputs<typeof Blueprint, typeof fields>;
    }
}

// A tool that lists the skills by name and description, and returns one's instructions when called.
function buildTool(skills: Skill[]) {
    const byName = new Map<string, Skill>();

    for (const skill of skills) {
        if (byName.has(skill.name))
            throw new Error(`Two connected skills share the name "${skill.name}"`);

        byName.set(skill.name, skill);
    }

    const names   = [...byName.keys()] as [string, ...string[]];
    const listing = skills.map(skill => `- ${skill.name}: ${skill.description}`).join("\n");

    return tool(
        async ({ name }) => byName.get(name)?.content ?? `Unknown skill "${name}"`,
        {
            name: "load_skill",
            description: `${PREAMBLE}\n${listing}`,
            schema: z.object({ name: z.enum(names) }),
        },
    );
}

// The same skill can arrive through two paths; keep one copy of each.
function uniqueById(refs: readonly SkillRef[]): SkillRef[] {
    return [...new Map(refs.map(ref => [ref.id, ref])).values()];
}
