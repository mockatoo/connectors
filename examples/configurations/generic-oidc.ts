/**
 * A Better Auth app that adds identity providers as plain OpenID Connect,
 * configured only by a discovery URL, as apps do for a customer's SSO or for
 * a provider without a built-in adapter. Nothing here is Mockatoo's: the
 * app reads the discovery URLs from its environment, which points them at
 * the mock outside production.
 */
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { genericOAuth } from "better-auth/plugins";

export function createGenericOidcAuth({
	baseURL,
	discovery,
	clientId,
	clientSecret,
}: {
	baseURL: string;
	/** Discovery URLs by provider ID, from the environment. */
	discovery: { workspace: string; entra: string; "entra-any": string };
	clientId: string;
	clientSecret: string;
}) {
	const database = {
		user: [] as Record<string, unknown>[],
		session: [] as Record<string, unknown>[],
		account: [] as Record<string, unknown>[],
		verification: [] as Record<string, unknown>[],
	};
	const auth = betterAuth({
		baseURL,
		secret: "oidc-secret-at-least-thirty-two-characters",
		database: memoryAdapter(database),
		plugins: [
			genericOAuth({
				config: [
					{
						providerId: "workspace",
						discoveryUrl: discovery.workspace,
						clientId,
						clientSecret,
						scopes: ["openid", "email", "profile"],
						pkce: true,
					},
					{
						// The customer's own Microsoft Entra tenant.
						providerId: "entra",
						discoveryUrl: discovery.entra,
						clientId,
						clientSecret,
						scopes: ["openid", "email", "profile"],
						pkce: true,
					},
					{
						// Any Microsoft account, through the common endpoint.
						providerId: "entra-any",
						discoveryUrl: discovery["entra-any"],
						clientId,
						clientSecret,
						scopes: ["openid", "email", "profile"],
						pkce: true,
					},
				],
			}),
		],
	});
	return { auth, database };
}
