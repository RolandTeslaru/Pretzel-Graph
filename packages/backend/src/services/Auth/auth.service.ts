import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { Principal } from '@/domain/Principal';
import { withSupabaseAssert } from '@pretzel-graph/shared/errors/supabase';
import { Auth } from '@pretzel-graph/shared/domain';

@Injectable()
export class AuthService {
    private readonly dbOps = {
        getMe: withSupabaseAssert('auth.getMe', async (
            supabase: SupabaseClient,
            userId: Auth.User.Id,
        ) => {
            const { data: row } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()
                .throwOnError();

            return Auth.User.Schema.parse(row);
        }),
    };

    public async getMe(principal: Principal.User): Promise<Auth.API.Me.Get.Response> {
        const user = await this.dbOps.getMe(principal.supabase, principal.userId);
        return { user };
    }
}
