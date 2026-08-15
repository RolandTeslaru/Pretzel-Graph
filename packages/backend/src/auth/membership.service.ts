import { Injectable } from '@nestjs/common';
import { Workspace } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { VerifiedToken } from '@/utils/auth';

@Injectable()
export class MembershipService {

    /**
     * The caller's role, or null when they are not a member.
     *
     * A verified token proves who someone is, never what they may do — that is this
     * lookup, run per request so a removal or demotion applies to the next one.
     */
    public async roleOf(token: VerifiedToken): Promise<Workspace.Role | null> {
        const existing = await DB.asService('read member role', (db) =>
            db
                .selectFrom('members')
                .select('role')
                .where('user_id', '=', token.userId)
                .executeTakeFirst(),
        );

        if (existing)
            return existing.role;

        return this.admit(token);
    }

    /**
     * Materialises the app-side rows for a subject the issuer already knows. The
     * first one to arrive owns the deployment; everyone after is refused until an
     * owner invites them.
     */
    private async admit(token: VerifiedToken): Promise<Workspace.Role | null> {
        return DB.asService('admit first member', async (db) => {
            const claimed = await db
                .selectFrom('members')
                .select('user_id')
                .limit(1)
                .executeTakeFirst();

            if (claimed)
                return null;

            const fallback = token.email?.split('@')[0] ?? token.userId.slice(0, 8);

            await db
                .insertInto('users')
                .values({
                    id: token.userId,
                    email: token.email ?? '',
                    username: token.username ?? fallback,
                    display_name: token.displayName ?? token.username ?? fallback,
                })
                .onConflict((oc) => oc.column('id').doNothing())
                .execute();

            await db
                .insertInto('members')
                .values({ user_id: token.userId, role: 'owner' })
                .onConflict((oc) => oc.column('user_id').doNothing())
                .execute();

            return 'owner';
        });
    }
}
