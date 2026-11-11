import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";
import Discord, { type DiscordProfile } from "next-auth/providers/discord";
import { MOCK_CLIENT, mockBase } from "./shared";

export type MockDiscordOptions = Partial<OAuthUserConfig<DiscordProfile>> & {
	/** Override only for a local or self-hosted provider. */
	origin?: string;
};

/**
 * Auth.js's own Discord provider with its three URLs pointed at the mock.
 * Auth.js merges these into the provider's defaults, so its scopes, profile
 * mapping and avatar URL run unchanged.
 *
 * Discord sends `iss` with every sign-in, and Auth.js rejects it unless the
 * provider declares Discord's issuer. An app that sets `issuer` (the
 * workaround, `"https://discord.com"`) gets the mock's issuer instead; one
 * that doesn't fails here as it does at Discord.
 */
export function MockDiscord(
	options: MockDiscordOptions = {},
): OAuthConfig<DiscordProfile> {
	const { origin, authorization, issuer, ...rest } = options;
	const root = mockBase(origin, "discord");
	return Discord({
		...rest,
		...(issuer ? { issuer: root } : {}),
		...MOCK_CLIENT,
		authorization: {
			...(typeof authorization === "object" ? authorization : {}),
			url: `${root}/api/oauth2/authorize`,
		},
		token: `${root}/api/oauth2/token`,
		userinfo: `${root}/api/users/@me`,
	});
}
