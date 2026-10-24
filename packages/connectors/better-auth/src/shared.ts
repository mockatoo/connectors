import type { BetterAuthPlugin } from "better-auth";
import { refreshAccessToken } from "better-auth/oauth2";

export type MockOptions<T extends { clientId?: unknown }> = Omit<
	T,
	"clientId" | "clientSecret"
> & {
	/** Accepted so production options can be passed unchanged; the mock's shared client is always used. */
	clientId?: T["clientId"];
	clientSecret?: string;
	/** Override only for a local or self-hosted provider. */
	origin?: string;
};

export const MOCK_ORIGIN = "https://mockatoo.com";
export const MOCK_CLIENT = {
	clientId: "mockatoo",
	clientSecret: "mockatoo-secret",
} as const;

export function withMockClient<T extends object>(options: T) {
	return { ...options, ...MOCK_CLIENT };
}

export const mockBase = (origin: string | undefined, provider: string) =>
	`${new URL(origin ?? MOCK_ORIGIN).origin}/${provider}`;

export function refreshMockAccessToken(
	refreshToken: string,
	config: { clientId: string; clientKey?: string; clientSecret: string },
	tokenEndpoint: string,
	includeClientKey = false,
) {
	return refreshAccessToken({
		refreshToken,
		options: {
			clientId: config.clientId,
			...(includeClientKey ? { clientKey: config.clientKey } : {}),
			clientSecret: config.clientSecret,
		},
		tokenEndpoint,
	});
}

/** Fetches the mock's signing keys and returns the one matching the token's `kid`. */
export const mockJwks =
	(keysURL: string) => async (header: { kid?: string }) => {
		const response = await fetch(keysURL);
		const { keys } = (await response.json()) as {
			keys: (JsonWebKey & { kid: string })[];
		};
		const jwk = keys.find((key) => key.kid === header.kid);
		if (!jwk) throw new Error(`JWK with kid ${header.kid} not found`);
		return crypto.subtle.importKey(
			"jwk",
			jwk,
			{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
			false,
			["verify"],
		);
	};

export function authorizationURL<T>(
	upstream: { createAuthorizationURL(data: T): Promise<URL> },
	base: string,
	path: string,
) {
	return async (data: T) => {
		const url = await upstream.createAuthorizationURL(data);
		return new URL(`${base}${path}${url.search}`);
	};
}

export function mockSocialPlugin<P extends object>(
	provider: P,
	providerId: string,
	pluginId: string,
	disableImplicitSignUp: boolean | undefined,
	pluginOptions: Record<string, unknown> = {},
): BetterAuthPlugin {
	// Better Auth sets this on providers it builds; connector providers are supplied by plugins.
	Object.assign(provider, { disableImplicitSignUp });
	return {
		id: pluginId,
		init: (ctx) => ({
			context: {
				socialProviders: [
					provider as (typeof ctx.socialProviders)[number],
					...ctx.socialProviders.filter((p) => p.id !== providerId),
				],
			},
			...pluginOptions,
		}),
	};
}
