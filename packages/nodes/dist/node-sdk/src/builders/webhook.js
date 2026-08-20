"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookBuilder = void 0;
exports.defineWebhook = defineWebhook;
/**
 * Brands the webhook id from a plain string literal, like defineCredential does for
 * credentials. path/method stay `string` — they hold `${{ ... }}` expressions resolved
 * per node instance at registration, so neither is a concrete Webhook.Method here.
 */
function defineWebhook(config) {
    return {
        id: config.id,
        path: config.path,
        method: config.method,
        // Only 'onReceived' is honoured today, so it's the default — blueprints needn't pin it.
        responseMode: config.responseMode ?? "onReceived",
        ...(config.credential ? { credential: config.credential } : {}),
    };
}
var WebhookBuilder;
(function (WebhookBuilder) {
    function buildBase(config) {
        return {
            id: config.id,
            method: config.method,
            path: config.path,
            responseMode: config.responseMode,
        };
    }
    function Route(config) {
        return buildBase(config);
    }
    WebhookBuilder.Route = Route;
    function GET(config) {
        return buildBase({ ...config, method: "GET" });
    }
    WebhookBuilder.GET = GET;
    function POST(config) {
        return buildBase({ ...config, method: "POST" });
    }
    WebhookBuilder.POST = POST;
    function PUT(config) {
        return buildBase({ ...config, method: "PUT" });
    }
    WebhookBuilder.PUT = PUT;
    function PATCH(config) {
        return buildBase({ ...config, method: "PATCH" });
    }
    WebhookBuilder.PATCH = PATCH;
    function DELETE(config) {
        return buildBase({ ...config, method: "DELETE" });
    }
    WebhookBuilder.DELETE = DELETE;
})(WebhookBuilder || (exports.WebhookBuilder = WebhookBuilder = {}));
