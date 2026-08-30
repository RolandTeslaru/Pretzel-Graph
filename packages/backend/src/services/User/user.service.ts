import { Injectable } from '@nestjs/common';
import { Principal } from '@/domain/Principal';
import { Auth } from '@pretzel-graph/shared/domain';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
    constructor(private readonly userRepository: UserRepository) {}

    /** Whether anyone owns this deployment yet. Public — it gates the first-run screen. */
    public async getStatus(): Promise<Auth.API.Status.Response> {
        const row = await this.userRepository.getDeploymentClaim(Principal.SELF);

        return { claimed: Boolean(row?.claimed_at) };
    }

    public async getMe(principal: Principal.User): Promise<Auth.API.Me.Get.Response> {
        const user = await this.userRepository.getMe(principal);

        return { user, role: principal.role };
    }

    public async updateMe(
        principal: Principal.User,
        payload: Auth.API.Me.Update.Request,
    ): Promise<Auth.API.Me.Update.Response> {
        const user = await this.userRepository.updateMe(principal, payload);

        return { user };
    }
}
