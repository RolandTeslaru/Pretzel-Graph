import { SetMetadata } from '@nestjs/common';
import { Workspace } from '@pretzel-graph/shared/domain';

export const MIN_ROLE_METADATA = '__min_role__';

export const RANK: Record<Workspace.Role, number> = {
    member: 0,
    admin: 1,
    owner: 2,
};

/** Declares the lowest role a route accepts. Checked by MemberAuthGuard. */
export const MinRole = (role: Workspace.Role) => SetMetadata(MIN_ROLE_METADATA, role);
