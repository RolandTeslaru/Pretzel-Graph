import { Foundations } from "./Foundations"
import { Workflow } from "./Workflow"

export namespace Expression {

    /** Matches the outer `${{ ... }}` wrapper. Capture group 1 is the inner JS body. */
    export const PATTERN = /\$\{\{\s*([\s\S]*?)\s*\}\}/;

    /** Matches `@key` sigils (root identifier only, stops before `.` or end of token). */
    export const CONTEXT_REF_PATTERN = /@([A-Za-z_][A-Za-z0-9_]*)/g;

    /**
     * Standardised evaluation context. Every expression runs against this
     * shape — `@node`, `@fields`, `@incoming`, and `@workflowConfig` are always available.
     */
    export interface Context {
        /** The node the expression is being evaluated for. */
        node: Workflow.Node
        /** Static field values on the current node, keyed by field id. */
        fields: Record<Foundations.Field.Id, unknown>
        /** Incoming port projections, keyed by input port id. */
        incoming: Record<Foundations.Port.Id, Foundations.Projection>
        /** Workflow configuration values, keyed by workflow field id. */
        workflowConfig: Record<Foundations.Field.Id, unknown>
    }

    export function createContext(
        node: Workflow.Node,
        fields: Record<Foundations.Field.Id, unknown>,
        incoming: Record<Foundations.Port.Id, Foundations.Projection>,
        workflowConfig: Record<Foundations.Field.Id, unknown> = {},
    ): Context {
        return {
            node,
            fields,
            incoming,
            workflowConfig,
        };
    }

    export function evaluateNodeFields(args: {
        node: Workflow.Node
        fields: Record<Foundations.Field.Id, unknown>
        incoming: Record<Foundations.Port.Id, Foundations.Projection>
        workflowConfig?: Record<Foundations.Field.Id, unknown>
    }): Record<Foundations.Field.Id, unknown> {
        const evaluated = { ...args.fields };

        for (const field of args.node.fields) {
            if (!("isExpression" in field) || field.isExpression !== true)
                continue;

            const value = evaluated[field.id as Foundations.Field.Id];
            if (typeof value !== "string")
                continue;

            evaluated[field.id as Foundations.Field.Id] = evaluate(
                value,
                createContext(
                    args.node,
                    evaluated,
                    args.incoming,
                    args.workflowConfig ?? {},
                ),
            );
        }

        return evaluated;
    }

    /**
     * Evaluate an expression against the standardised context.
     *
     * The expression must be wrapped in `${{ ... }}`. Inside, any `@key`
     * reference resolves to the matching field on `context` — full JS
     * property traversal, method calls, and operators are all supported.
     *
     * @example
     *   evaluate("${{ @node.id }}", ctx)
     *   evaluate("${{ @fields['model'] }}", ctx)
     *   evaluate("${{ @incoming['port-1'].value + 5 }}", ctx)
     *   evaluate("${{ @workflowConfig['apiKey'] }}", ctx)
     *
     * Returns the raw string unchanged if it contains no `${{ }}` wrapper.
     */
    export function evaluate(
        expression: string | undefined,
        context: Context
    ): unknown {
        if (!expression) return undefined;

        const match = expression.match(PATTERN);
        if (!match) return expression;

        const body = match[1];
        // Strip the @ sigil — each @key becomes the bare variable name
        const rewritten = body.replace(CONTEXT_REF_PATTERN, '$1');

        const keys = Object.keys(context);
        const values = Object.values(context);

        try {
            // eslint-disable-next-line no-new-func
            return new Function(...keys, `return (${rewritten})`)(...values);
        } catch (e) {
            throw new ExpressionError(`Failed to evaluate: ${expression}\n${e}`);
        }
    }

    export class ExpressionError extends Error {
        constructor(message: string) {
            super(message);
            this.name = "ExpressionError";
        }
    }

    export function resolveWorkflowConfig(
        workflowData: Workflow.Data,
    ): Record<Foundations.Field.Id, unknown> {
        const config: Record<Foundations.Field.Id, unknown> = {};
        const overrides = workflowData.staticValues[Workflow.WORKFLOW_CONFIG_NODE_ID] ?? {};

        for (const field of workflowData.fields ?? []) {
            if (field.id in overrides)
                config[field.id] = overrides[field.id as Foundations.Field.Id];
            else if ("initialValue" in field)
                config[field.id] = field.initialValue;
        }

        return config;
    }
}
