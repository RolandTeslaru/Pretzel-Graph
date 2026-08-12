import { INestApplication } from '@nestjs/common';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { SCOPES, ScopeName, scopeOf } from './scopes';
import { SCOPES_METADATA, ScopedGuard } from './scoped.guard';

/**
 * Deliberately unscoped, permanently. Each names a registered scope's parameter but
 * authorizes through RLS: the read runs under DB.asUser, and there is no side effect built
 * from an id the database never validated. Scoping them would add a lookup and change
 * nothing. This set is not expected to shrink.
 *
 * Only routes the audit can SEE need listing here — a route keyed on an unregistered param
 * is invisible to it either way. VersionControlController.get is the case to keep in mind:
 * its SELECT policy deliberately exposes active publications on public workflows, so an
 * ownership check would break it. It needs no entry only because `publicationId` is not a
 * registered scope. Registering one would make this list load-bearing for that route.
 */
const RLS_COVERED_ROUTES = new Set([
    'VersionControlController.list',
    'VersionControlController.getActiveByWorkflow',
    'ExecutionController.get',
    'ExecutionController.metaGet',
]);

/**
 * Not yet migrated. Unlike the set above these are pending work, and this one IS expected
 * to reach empty — an entry here is a TODO, not a decision.
 */
const UNMIGRATED_ROUTES = new Set<string>([]);

/**
 * The fail-closed param decorator only fires on handlers that actually read an id, so a
 * scoped route needing none would keep the hole it was meant to close. This walks every
 * route at bootstrap and aborts on a mismatch — a missing guard becomes a crash at boot
 * rather than a silent hole in production.
 *
 * Both directions are checked: a path naming a resource must declare that scope, and a
 * declared scope must appear in the path.
 */
export function auditScopedRoutes(app: INestApplication) {
    const discovery = app.get(DiscoveryService);
    const scanner   = new MetadataScanner();
    const problems: string[] = [];

    for (const wrapper of discovery.getControllers()) {
        const controller = wrapper.metatype;

        if (!controller || !wrapper.instance)
            continue;

        const prototype  = Object.getPrototypeOf(wrapper.instance);
        const basePath   = Reflect.getMetadata(PATH_METADATA, controller) ?? '';

        for (const method of scanner.getAllMethodNames(prototype)) {
            const handler = prototype[method];

            const routePath = Reflect.getMetadata(PATH_METADATA, handler);

            if (routePath === undefined)
                continue;

            const fullPath = `${basePath}/${routePath}`;
            const declared = Reflect.getMetadata(SCOPES_METADATA, handler) as ScopeName[] | undefined;
            const guards   = (Reflect.getMetadata(GUARDS_METADATA, handler) ?? []) as unknown[];
            const guarded  = guards.includes(ScopedGuard);
            const where    = `${controller.name}.${method} (${fullPath})`;

            const route  = `${controller.name}.${method}`;
            const exempt = RLS_COVERED_ROUTES.has(route) || UNMIGRATED_ROUTES.has(route);

            for (const [name, definition] of Object.entries(SCOPES)) {
                const inPath = fullPath.split('/').includes(`:${definition.param}`);

                if (inPath && !exempt && !declared?.includes(name as ScopeName))
                    problems.push(`${where} — path names :${definition.param} but does not declare @Scoped('${name}')`);
            }

            if (!declared?.length)
                continue;

            if (!guarded)
                problems.push(`${where} — declares scopes but ScopedGuard is not applied`);

            for (const name of declared) {
                const param = scopeOf(name).param;

                if (!fullPath.split('/').includes(`:${param}`))
                    problems.push(`${where} — declares @Scoped('${name}') but has no :${param} path parameter`);
            }
        }
    }

    if (problems.length)
        throw new Error(`Scope audit failed:\n  ${problems.join('\n  ')}`);
}
