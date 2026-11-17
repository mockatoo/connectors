import type { BetterAuthPlugin } from "better-auth";
import type { OAuth2Tokens } from "better-auth/oauth2";
import { refreshAccessToken } from "better-auth/oauth2";

export type CodeRequest = {
	code: string;
	codeVerifier?: string;
	redirectURI: string;
};
export type { OAuth2Tokens };

export type MockOptions<T extends { clientId?: unknown }> = Omit<
	T,
	"clientId" | "clientSecret"
> & {
	/** Accepted so production options can be passed unchanged; the mock's shared client is always used. */
	clientId?: T["clientId"];
	clientSecret?: string;
};

export const MOCK_ORIGIN = "https://app.mockatoo.globalunderdog.com";
/** Hosted by default; the environment override is for Mockatoo development. */
export const MOCKATOO_URL =
	(typeof process !== "undefined" && process.env.MOCKATOO_URL) || MOCK_ORIGIN;
export const MOCK_CLIENT = {
	clientId: "mockatoo",
	clientSecret: "mockatoo-secret",
} as const;

export function withMockClient<T extends object>(options: T) {
	return { ...options, ...MOCK_CLIENT };
}

export const mockBase = (provider: string) =>
	`${new URL(MOCKATOO_URL).origin}/${provider}`;

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
	upstream: { createAuthorizationURL(data: T): URL | Promise<URL> },
	base: string,
	path: string,
) {
	return async (data: T) => {
		const url = await upstream.createAuthorizationURL(data);
		return new URL(`${base}${path}${url.search}`);
	};
}

/**
 * Decodes a JWT's payload claims without verifying the signature, the way
 * Better Auth's own providers read ID tokens.
 */
export function decodeJwtClaims(jwt: string): Record<string, unknown> {
	const payload = jwt.split(".")[1] ?? "";
	const bytes = Uint8Array.from(
		atob(payload.replaceAll("-", "+").replaceAll("_", "/")),
		(char) => char.charCodeAt(0),
	);
	return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
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
