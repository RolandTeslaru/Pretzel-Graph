import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { orderScopes, ScopeName } from './scopes';
import { UserAuthGuard } from './user-auth.guard';
import { SCOPES_METADATA, ScopedGuard } from './scoped.guard';

/**
 * Declares which resources a route is scoped to. Ownership of each is proved before the
 * handler runs, along with the parent relation between them.
 *
 * Both guards are named in one UseGuards call so their order is fixed here rather than
 * depending on how the decorators happen to be stacked at the route — TypeScript applies
 * method decorators bottom-up, so a separate @UseGuards(UserAuthGuard) above @Scoped would
 * run *after* it and leave no principal to check against. UserAuthGuard short-circuits when
 * a principal is already present, so controller-level mounts cost nothing.
 */
export const Scoped = (...scopes: ScopeName[]) =>
    applyDecorators(
        SetMetadata(SCOPES_METADATA, orderScopes(scopes)),
        UseGuards(UserAuthGuard, ScopedGuard),
    );
