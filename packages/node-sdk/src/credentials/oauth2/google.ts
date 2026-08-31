import type { Vault } from "@pretzel-graph/shared/domain"

// Google's OAuth2 endpoints. Scope-agnostic — the credential supplies the scopes.
export function googleOAuth2Provider(
    scopes: readonly string[],
): Vault.OAuth.Provider {
    return {
        authUrl:     "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl:    "https://oauth2.googleapis.com/token",
        revokeUrl:   "https://oauth2.googleapis.com/revoke",
        userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
        scopes,
        // offline + consent is what makes Google return a refresh token every time.
        extraAuthParams: {
            access_type:            "offline",
            prompt:                 "consent",
            include_granted_scopes: "true",
        },
        scopeSeparator: " ",
    }
}
