import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Vault } from '@pretzel-graph/shared/domain';
import { OAuthService } from './oauth.service';

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Hands the result to the editor window that opened the popup, then closes itself.
function page(message: Vault.OAuth.PopupMessage, headline: string): string {
    const payload = JSON.stringify(message).replace(/</g, '\\u003c');

    return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Pretzel</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;color:#222}p{max-width:32rem;text-align:center}</style>
</head>
<body>
<p>${escapeHtml(headline)}</p>
<script>
(function () {
    var message = ${payload};
    if (window.opener) {
        window.opener.postMessage(message, window.location.origin);
        window.close();
    }
})();
</script>
</body>
</html>`;
}

// The provider sends the browser here; nothing on it is authenticated but the signed state.
@Controller('oauth')
export class OAuthCallbackController {
    constructor(private readonly oauth: OAuthService) {}

    @Get('callback')
    async callback(
        @Query('code')  code:  string | undefined,
        @Query('state') state: string | undefined,
        @Query('error') error: string | undefined,
        @Res() res: Response,
    ): Promise<void> {
        res.type('html').set('Cache-Control', 'no-store');

        try {
            const instanceId = await this.oauth.callback({ code, state, error });

            res.send(page({ type: 'pretzel:oauth', instanceId }, 'Connected. You can close this window.'));
        }
        catch (caught) {
            const reason = (caught as Error).message || 'Connection failed';

            res.status(400).send(page({ type: 'pretzel:oauth', error: reason }, reason));
        }
    }
}
