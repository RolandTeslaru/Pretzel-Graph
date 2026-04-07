export namespace Expression {

    /**
     * Regex to match $portName references in expressions.
     * Captures the port name (alphanumeric + underscore).
     * Matches: $input, $input.foo, $input[0].bar
     * The regex only captures the $portName part — the rest (.foo, [0], etc.) stays as JS.
     */
    export const PORT_REF_PATTERN = /\$([a-zA-Z_][a-zA-Z0-9_]*)/g

    /**
     * Evaluate an expression against a map of port values, in-process.
     *
     * Strips the `$` prefix from each port reference, then compiles the
     * expression as a function whose parameters are the referenced port
     * names and invokes it with the matching values as live bindings.
     * Port values are passed by reference — no serialization, no stringify,
     * no projection. `$input.tool_calls.length` becomes
     * `new Function("input", "return (input.tool_calls.length)")(aiMessage)`,
     * so property access maps 1:1 to the real instance shape.
     *
     * Use this on the worker side, where LC class instances flow through
     * directly. For cross-realm evaluation (e.g. the frontend sandbox)
     * use `preprocess` instead, which inlines values as JSON literals.
     */
    export function evaluate(
        expression: string | undefined,
        portValues: Record<string, unknown>
    ): unknown {
        if (!expression) return undefined;

        const referenced = new Set<string>();
        const rewritten = expression.replace(PORT_REF_PATTERN, (_match, name: string) => {
            referenced.add(name);
            return name;
        });

        const params = [...referenced];
        const args = params.map(name => {
            if (!(name in portValues))
                throw new ExpressionError(`Unknown port reference: $${name}`);
            return portValues[name];
        });

        return new Function(...params, `return (${rewritten})`)(...args);
    }

    /**
     * Inline `$portName` references as JSON literals, returning a self-
     * contained JS source string. Used by the frontend sandbox preview,
     * which evaluates expressions in a cross-realm worker and therefore
     * cannot receive live JS bindings.
     *
     * Only safe for values that survive `JSON.stringify` cleanly — i.e.
     * plain projections, not raw LC class instances. The worker side
     * should use `evaluate` instead.
     *
     * "$input.messages.length + 20"  →  "([{...}, {...}]).messages.length + 20"
     * "100"                          →  "100"
     */
    export function preprocess(
        expression: string | undefined,
        portValues: Record<string, unknown>
    ): string {
        if (!expression) return "";
        return expression.replace(PORT_REF_PATTERN, (_match, portName: string) => {
            if (!(portName in portValues))
                throw new ExpressionError(`Unknown port reference: $${portName}`)

            const value = portValues[portName]
            return `(${JSON.stringify(value)})`
        })
    }

    export class ExpressionError extends Error {
        constructor(message: string) {
            super(message)
            this.name = "ExpressionError"
        }
    }
}
