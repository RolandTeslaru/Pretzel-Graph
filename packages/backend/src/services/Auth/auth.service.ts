import { Injectable } from '@nestjs/common';
import { Principal } from '@/domain/Principal';
import { Auth } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';

@Injectable()
export class AuthService {
    public async getMe(principal: Principal.User): Promise<Auth.API.Me.Get.Response> {
        const user = await DB.asUser(principal, async (trx) => {
            const row = await trx
                .selectFrom('users')
                .selectAll()
                .where('id', '=', principal.userId)
                .executeTakeFirstOrThrow();

            return DB.User.toDomain(row);
        },
        );
        return { user };
    }
}
