import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Scope, ScopeName } from '@/auth/scopes';
import { ScopedRequest } from '@/auth/scoped.guard';

/**
 * Reads a resolved scope off the request — never `request.params`. An id exists here only
 * because ScopedGuard vouched for it, so a route that declares the param without the guard
 * fails on its first request instead of quietly serving unauthorized data.
 */
const readScope = <K extends ScopeName>(context: ExecutionContext, name: K): Scope<K> => {
    const { scopes } = context.switchToHttp().getRequest<ScopedRequest>();

    const scope = scopes?.[name];

    if (!scope)
        throw new Error(`Scope '${name}' requested without @Scoped('${name}') on the route`);

    return scope as Scope<K>;
};

export const WorkflowIdParam = createParamDecorator(
    (_: unknown, context: ExecutionContext) => readScope(context, 'workflow').id,
);

export const ExecutionIdParam = createParamDecorator(
    (_: unknown, context: ExecutionContext) => readScope(context, 'execution').id,
);

export const ChatIdParam = createParamDecorator(
    (_: unknown, context: ExecutionContext) => readScope(context, 'chat').id,
);

export const ChatScope = createParamDecorator(
    (_: unknown, context: ExecutionContext) => readScope(context, 'chat'),
);

export const WorkflowScope = createParamDecorator(
    (_: unknown, context: ExecutionContext) => readScope(context, 'workflow'),
);

export const ExecutionScope = createParamDecorator(
    (_: unknown, context: ExecutionContext) => readScope(context, 'execution'),
);
