import { z, ZodType } from 'zod';
import { Auth, Chat, Execution, Workflow } from '@pretzel-graph/shared/domain';
import type { PermissionService } from '@/services/Permission/permission.service';

/**
 * One entry per resource a route can be scoped to. Everything else derives from this
 * object: which guard work runs, what lands on the request, what the handler receives,
 * and which parent relation is checked.
 */
type ScopeDefinition = {
    param:    string;
    schema:   ZodType<any>;
    notFound: string;
    parent?:  { scope: string, via: string };
    load:     (id: any, permissions: PermissionService) => Promise<{ ownerId: Auth.User.Id } & Record<string, unknown> | null>;
};

export const SCOPES = {

    workflow: {
        param:    'workflowId',
        schema:   Workflow.Id,
        notFound: 'Workflow not found',
        load:     (id: Workflow.Id, permissions: PermissionService) => permissions.loadWorkflowScope(id),
    },

    execution: {
        param:    'executionId',
        schema:   Execution.Id,
        notFound: 'Execution not found',
        parent:   { scope: 'workflow', via: 'workflowId' },
        load:     (id: Execution.Id, permissions: PermissionService) => permissions.loadExecutionContext(id),
    },

    chat: {
        param:    'chatId',
        schema:   Chat.Id,
        notFound: 'Chat not found',
        parent:   { scope: 'workflow', via: 'workflow_id' },
        load:     (id: Chat.Id, permissions: PermissionService) => permissions.loadChatScope(id),
    },

} as const satisfies Record<string, ScopeDefinition>;

export type ScopeName = keyof typeof SCOPES;

export type ScopeId<K extends ScopeName> = z.infer<(typeof SCOPES)[K]['schema']>;

export type Scope<K extends ScopeName> =
    { id: ScopeId<K> } & NonNullable<Awaited<ReturnType<(typeof SCOPES)[K]['load']>>>;

export type ResolvedScopes = { [K in ScopeName]?: Scope<K> };

export const isScopeName = (value: string): value is ScopeName => value in SCOPES;

/** Widened accessor — `SCOPES[name]` on a union member without `parent` has no such key. */
export const scopeOf = (name: ScopeName): ScopeDefinition => SCOPES[name];

/**
 * Parents before children, so a child's relation check always finds its parent slot
 * already filled. Correctness must not depend on the order the annotations were typed in.
 */
export const orderScopes = (names: readonly ScopeName[]): ScopeName[] => {
    const ordered: ScopeName[] = [];

    const visit = (name: ScopeName) => {
        if (ordered.includes(name))
            return;

        const parent = scopeOf(name).parent?.scope;

        if (parent && isScopeName(parent) && names.includes(parent))
            visit(parent);

        ordered.push(name);
    };

    names.forEach(visit);

    return ordered;
};
