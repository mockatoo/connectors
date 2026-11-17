import type { GenericOAuthConfig } from "better-auth/plugins/generic-oauth";
import { MOCK_CLIENT, mockBase } from "./shared";

/**
 * Configures Mockatoo as a Generic OAuth provider, for apps that list
 * providers through Better Auth's `genericOAuth` plugin. Signs in through the
 * Google mock, found by its OpenID Connect discovery document.
 *
 * @example
 * genericOAuth({ config: [mockatoo()] });
 */
export function mockatoo(
	options: { redirectURI?: string } = {},
): GenericOAuthConfig {
	return {
		providerId: "mockatoo",
		discoveryUrl: `${mockBase("google")}/.well-known/openid-configuration`,
		...MOCK_CLIENT,
		scopes: ["openid", "profile", "email"],
		pkce: true,
		...(options.redirectURI ? { redirectURI: options.redirectURI } : {}),
	};
}
