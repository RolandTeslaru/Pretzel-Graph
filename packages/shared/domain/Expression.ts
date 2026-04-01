export namespace Expression {

    /**
     * Regex to match $portName references in expressions.
     * Captures the port name (alphanumeric + underscore).
     * Matches: $input, $input.foo, $input[0].bar
     * The regex only captures the $portName part — the rest (.foo, [0], etc.) stays as JS.
     */
    export const PORT_REF_PATTERN = /\$([a-zA-Z_][a-zA-Z0-9_]*)/g

    /**
     * Takes an expression string and a map of port values,
     * replaces $portName references with serialized values,
     * returns a pure JS string ready to be evaluated.
     *
     * "$input.messages.length + 20"  →  "([{...}, {...}]).messages.length + 20"
     * "100"                          →  "100"
     */
    export function preprocess(
        expression: string,
        portValues: Record<string, unknown>
    ): string {
        return expression.replace(PORT_REF_PATTERN, (match, portName: string) => {
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
