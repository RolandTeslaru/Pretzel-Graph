import { CanActivate, ExecutionContext as NestExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SystemError } from '@pretzel-graph/shared/domain';
import { Principal } from '@/domain/Principal';
import { PermissionService } from '@/services/Permission/permission.service';
import { ResolvedScopes, ScopeName, scopeOf } from './scopes';

export const SCOPES_METADATA = '__scopes__';

export interface ScopedRequest extends Request {
    principal?: Principal;
    scopes:     ResolvedScopes;
}

/**
 * Proves the caller owns every resource the route names, before the handler runs.
 *
 * Ids come from the path, never the body — the value that was authorized and the value
 * the handler acts on are then the same value by construction. Results land on
 * `request.scopes`, which is the only place the param decorators read from.
 */
@Injectable()
export class ScopedGuard implements CanActivate {

    constructor(
        @Inject(PermissionService) private readonly permissions: PermissionService,
        @Inject(Reflector)         private readonly reflector:   Reflector,
    ) {}

    async canActivate(context: NestExecutionContext): Promise<boolean> {
        const scopes = this.reflector.get<ScopeName[] | undefined>(SCOPES_METADATA, context.getHandler());

        if (!scopes?.length)
            return true;

        const request = context.switchToHttp().getRequest<ScopedRequest>();

        if (request.principal?.type !== 'user')
            throw new UnauthorizedException('User principal required');

        const requesterId = request.principal.userId;

        request.scopes = {};

        for (const name of scopes)
            await this.resolve(request, name, requesterId);

        return true;
    }

    private async resolve(request: ScopedRequest, name: ScopeName, requesterId: Principal.User['userId']) {
        const definition = scopeOf(name);

        // A body key colliding with a scope this route declares is a second, unauthorized
        // id reaching the handler. Rejected only for declared scopes — elsewhere the same
        // field name can be a legitimate proposal for a row that does not exist yet.
        if (request.body && typeof request.body === 'object' && definition.param in request.body)
            throw new SystemError(SystemError.Code.BAD_REQUEST, `${definition.param} belongs in the path`);

        const raw = request.params[definition.param];

        if (raw === undefined)
            throw new Error(`Route declares scope '${name}' but has no :${definition.param} path parameter`);

        const parsed = definition.schema.safeParse(raw);

        if (!parsed.success)
            throw new SystemError(SystemError.Code.NOT_FOUND, definition.notFound);

        const payload = await definition.load(parsed.data, this.permissions);

        if (!payload || payload.ownerId !== requesterId)
            throw new SystemError(SystemError.Code.NOT_FOUND, definition.notFound);

        this.relate(request, definition, payload);

        request.scopes[name] = { id: parsed.data, ...payload } as never;
    }

    // Owning both ids is not the same as the child belonging to the parent named in the URL.
    private relate(
        request:    ScopedRequest,
        definition: ReturnType<typeof scopeOf>,
        payload:    Record<string, unknown>,
    ) {
        if (!definition.parent)
            return;

        const parent = request.scopes[definition.parent.scope as ScopeName];

        if (!parent)
            return;

        if (payload[definition.parent.via] !== parent.id)
            throw new SystemError(SystemError.Code.NOT_FOUND, definition.notFound);
    }
}
