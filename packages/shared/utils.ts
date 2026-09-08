import type { Workflow } from "./domain/Workflow";
import type { Field } from "./domain/Foundations/Field";
import { Webhook } from "./domain/Webhook";

export function resolveWebhook(
    webhook: Webhook,
    node: Workflow.Node.Raw,
    staticValues: Record<Field.Id, unknown>,
): Webhook.Resolved {
    const ctx: LegacyExpressionContext = {
        node,
        fields: staticValues,
        incoming: {},
        globalFields: {},
    };
    return Webhook.ResolvedSchema.parse({
        id: webhook.id,
        path: evaluateLegacyExpression(webhook.path, ctx),
        method: evaluateLegacyExpression(webhook.method, ctx),
        responseMode: evaluateLegacyExpression(webhook.responseMode, ctx),
    });
}

interface LegacyExpressionContext {
    node: Workflow.Node.Raw
    fields: Record<Field.Id, unknown>
    incoming: Record<string, unknown>
    globalFields: Record<Field.Id, unknown>
}

const LEGACY_EXPRESSION_PATTERN = /\$\{\{\s*([\s\S]*?)\s*\}\}/;
const LEGACY_CONTEXT_REF_PATTERN = /@([A-Za-z_][A-Za-z0-9_]*)/g;

// Legacy webhook-only evaluator. Remove once webhook resolution moves to Airlock `$` globals.
function evaluateLegacyExpression(
    expression: string | undefined,
    context: LegacyExpressionContext,
): unknown {
    if (!expression) return undefined;

    const match = expression.match(LEGACY_EXPRESSION_PATTERN);
    if (!match) return expression;

    const body = match[1];
    const rewritten = body.replace(LEGACY_CONTEXT_REF_PATTERN, "$1");
    const keys = Object.keys(context);
    const values = Object.values(context);

    // eslint-disable-next-line no-new-func
    return new Function(...keys, `return (${rewritten})`)(...values);
}
