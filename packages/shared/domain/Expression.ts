import { Foundations } from "./Foundations"
import { Workflow } from "./Workflow"

export namespace Expression {

    /** Matches the outer `${{ ... }}` wrapper. Capture group 1 is the inner JS body. */
    export const PATTERN = /\$\{\{\s*([\s\S]*?)\s*\}\}/;

    /** Matches `@key` sigils (root identifier only, stops before `.` or end of token). */
    export const CONTEXT_REF_PATTERN = /@([A-Za-z_][A-Za-z0-9_]*)/g;

    /**
     * Standardised evaluation context. Every expression runs against this
     * shape — `@thisNode` and `@incoming` are always available.
     */
    export interface Context {
        /** The node the expression is being evaluated for. */
        thisNode: Workflow.Node
        /** Static field values on the current node, keyed by field id. */
        thisNodeValues: Record<Foundations.Field.Id, unknown>
        /** Incoming port projections, keyed by input port id. */
        incoming: Record<Foundations.Port.Id, Foundations.Projection>
    }

    /**
     * Evaluate an expression against the standardised context.
     *
     * The expression must be wrapped in `${{ ... }}`. Inside, any `@key`
     * reference resolves to the matching field on `context` — full JS
     * property traversal, method calls, and operators are all supported.
     *
     * @example
     *   evaluate("${{ @thisNode.id }}", ctx)
     *   evaluate("${{ @incoming['port-1'].value + 5 }}", ctx)
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
}
