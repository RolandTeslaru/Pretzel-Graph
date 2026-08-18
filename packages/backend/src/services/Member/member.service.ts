import { Injectable, Logger } from '@nestjs/common';
import { sql } from 'kysely';
import { Auth, Workspace } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { VerifiedToken, subjectExistsAtIssuer } from '@/utils/auth';

/** The account named as owner at deploy time, when one is configured. */
function configuredOwner(): Auth.User.Id | null {
    const value = process.env.WORKSPACE_OWNER_ID;

    if (!value)
        return null;

    const parsed = Auth.User.Id.safeParse(value);

    // Fails loudly: a malformed id matches nobody and would lock everyone out.
    if (!parsed.success)
        throw new Error('WORKSPACE_OWNER_ID is not a valid user id');

    return parsed.data;
}

@Injectable()
export class MemberService {

    private readonly logger = new Logger(MemberService.name);

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

        return this.claim(token);
    }

    /**
     * Takes ownership of an unclaimed deployment. Happens once in its lifetime: the
     * `deployment` row records the claim, so emptying `members` cannot hand ownership
     * to whoever arrives next.
     *
     * When the deployment names an owner, only that account may claim it. Without
     * one, the first account to arrive does.
     */
    private async claim(token: VerifiedToken): Promise<Workspace.Role | null> {
        const owner = configuredOwner();

        if (owner && token.userId !== owner)
            return null;

        const unclaimed = await DB.asService('read deployment claim', (db) =>
            db
                .selectFrom('deployment')
                .select('claimed_at')
                .executeTakeFirst(),
        );

        if (!unclaimed || unclaimed.claimed_at)
            return null;

        // Local verification cannot see a deleted account, and this is the one
        // decision worth a round trip to be sure of.
        if (!await subjectExistsAtIssuer(token))
            return null;

        return DB.asService('claim deployment', async (db) => {
            // Stakes the claim first: a concurrent first request blocks here, then
            // finds it taken. `claimed_by` follows once the user row it references exists.
            const claim = await db
                .updateTable('deployment')
                .set({ claimed_at: sql<string>`now()` })
                .where('claimed_at', 'is', null)
                .executeTakeFirst();

            if (claim.numUpdatedRows === 0n)
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

            await db
                .updateTable('deployment')
                .set({ claimed_by: token.userId })
                .execute();

            this.logger.log(`Deployment claimed by ${token.email ?? token.userId}`);

            return 'owner';
        });
    }
}
