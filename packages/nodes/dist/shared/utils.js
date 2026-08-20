"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateRule = void 0;
exports.evaluateRuleGroup = evaluateRuleGroup;
exports.resolveWebhook = resolveWebhook;
exports.evaluateCondition = evaluateCondition;
const domain_1 = require("./domain");
const evaluateRule = (rule, resolve) => {
    const left = resolve(rule.leftOperand, rule.leftIsExpression);
    // Shared operators — present on every dataType
    if (rule.operator === "exists")
        return left !== undefined && left !== null;
    if (rule.operator === "not_exists")
        return left === undefined || left === null;
    if (rule.operator === "is_empty")
        return left === "" || left === null || left === undefined || (Array.isArray(left) && left.length === 0);
    if (rule.operator === "is_not_empty")
        return left !== "" && left !== null && left !== undefined && !(Array.isArray(left) && left.length === 0);
    const right = rule.rightOperand != null
        ? resolve(rule.rightOperand, rule.rightIsExpression)
        : undefined;
    switch (rule.dataType) {
        case "string": {
            const l = String(left);
            const r = String(right);
            switch (rule.operator) {
                case "equals": return l === r;
                case "not_equals": return l !== r;
                case "contains": return l.includes(r);
                case "not_contains": return !l.includes(r);
                case "starts_with": return l.startsWith(r);
                case "not_starts_with": return !l.startsWith(r);
                case "ends_with": return l.endsWith(r);
                case "not_ends_with": return !l.endsWith(r);
                case "matches_regex": return new RegExp(r).test(l);
                case "not_matches_regex": return !new RegExp(r).test(l);
            }
            throw new Error(`Unsupported operator "${rule.operator}" for string`);
        }
        case "number": {
            const l = Number(left);
            const r = Number(right);
            switch (rule.operator) {
                case "equals": return l === r;
                case "not_equals": return l !== r;
                case "greater_than": return l > r;
                case "less_than": return l < r;
                case "greater_than_or_equal": return l >= r;
                case "less_than_or_equal": return l <= r;
            }
            throw new Error(`Unsupported operator "${rule.operator}" for number`);
        }
        case "dateTime": {
            const l = new Date(left).getTime();
            const r = new Date(right).getTime();
            switch (rule.operator) {
                case "equals": return l === r;
                case "not_equals": return l !== r;
                case "after": return l > r;
                case "before": return l < r;
                case "after_or_equal": return l >= r;
                case "before_or_equal": return l <= r;
            }
            throw new Error(`Unsupported operator "${rule.operator}" for dateTime`);
        }
        case "boolean": {
            const l = Boolean(left);
            switch (rule.operator) {
                case "is_true": return l === true;
                case "is_false": return l === false;
                case "equals": return l === Boolean(right);
                case "not_equals": return l !== Boolean(right);
            }
            throw new Error(`Unsupported operator "${rule.operator}" for boolean`);
        }
        case "array": {
            const arr = Array.isArray(left) ? left : [];
            switch (rule.operator) {
                case "contains": return arr.includes(right);
                case "not_contains": return !arr.includes(right);
                case "length_equals": return arr.length === Number(right);
                case "length_not_equals": return arr.length !== Number(right);
                case "length_greater_than": return arr.length > Number(right);
                case "length_less_than": return arr.length < Number(right);
                case "length_greater_than_or_equal": return arr.length >= Number(right);
                case "length_less_than_or_equal": return arr.length <= Number(right);
            }
            throw new Error(`Unsupported operator "${rule.operator}" for array`);
        }
        case "object":
            // Object only supports shared operators, handled above
            throw new Error(`Unsupported operator "${rule.operator}" for object`);
    }
};
exports.evaluateRule = evaluateRule;
function evaluateRuleGroup(condition, ruleGroup, resolve) {
    const { children, combinator } = ruleGroup;
    const evaluateChild = (id) => {
        if (id in condition.groups) {
            const group = condition.groups[id];
            return evaluateRuleGroup(condition, group, resolve);
        }
        if (id in condition.rules) {
            const rule = condition.rules[id];
            return (0, exports.evaluateRule)(rule, resolve);
        }
        throw new Error(`Invalid condition: no group or rule with id ${id}`);
    };
    if (combinator === "AND")
        return children.every(id => evaluateChild(id));
    if (combinator === "OR")
        return children.some(id => evaluateChild(id));
    throw new Error(`Invalid combinator: ${combinator}`);
}
function resolveWebhook(webhook, node, staticValues) {
    const ctx = {
        node,
        fields: staticValues,
        incoming: {},
        workflowConfig: {},
    };
    return domain_1.Webhook.ResolvedSchema.parse({
        id: webhook.id,
        path: evaluateLegacyExpression(webhook.path, ctx),
        method: evaluateLegacyExpression(webhook.method, ctx),
        responseMode: evaluateLegacyExpression(webhook.responseMode, ctx),
    });
}
function evaluateCondition(condition, resolve) {
    return evaluateRuleGroup(condition, condition.groups[condition.rootId], resolve);
}
const LEGACY_EXPRESSION_PATTERN = /\$\{\{\s*([\s\S]*?)\s*\}\}/;
const LEGACY_CONTEXT_REF_PATTERN = /@([A-Za-z_][A-Za-z0-9_]*)/g;
// Legacy webhook-only evaluator. Remove once webhook resolution moves to Airlock `$` globals.
function evaluateLegacyExpression(expression, context) {
    if (!expression)
        return undefined;
    const match = expression.match(LEGACY_EXPRESSION_PATTERN);
    if (!match)
        return expression;
    const body = match[1];
    const rewritten = body.replace(LEGACY_CONTEXT_REF_PATTERN, "$1");
    const keys = Object.keys(context);
    const values = Object.values(context);
    // eslint-disable-next-line no-new-func
    return new Function(...keys, `return (${rewritten})`)(...values);
}
