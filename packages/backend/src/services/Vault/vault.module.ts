import { Module } from '@nestjs/common';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { VaultRepository } from './vault.repository';
import { OAuthService } from './OAuth/oauth.service';
import { OAuthProvider } from './OAuth/oauth.provider';
import { OAuthState } from './OAuth/oauth.state';
import { OAuthController } from './OAuth/oauth.controller';
import { OAuthCallbackController } from './OAuth/oauth-callback.controller';
import { InternalVaultController } from './internal-vault.controller';

@Module({
    controllers: [VaultController, OAuthController, OAuthCallbackController, InternalVaultController],
    providers:   [VaultService, VaultRepository, OAuthService, OAuthProvider, OAuthState],
    exports:     [VaultService, VaultRepository, OAuthService],
})
export class VaultModule {}
