import { validateAuthorizationCode } from "better-auth/oauth2";
import {
	type DiscordOptions,
	type DiscordProfile,
	discord,
} from "better-auth/social-providers";
import {
	authorizationURL,
	type MockOptions,
	mockBase,
	mockSocialPlugin,
	refreshMockAccessToken,
	withMockClient,
} from "./shared";

export type MockDiscordOptions = MockOptions<DiscordOptions>;

/**
 * Replaces Better Auth's `discord` social provider with the mock's Discord
 * endpoints. Better Auth hardcodes discord.com, so the profile lookup below
 * is upstream's with only the URL changed. Upstream builds the authorization
 * URL, including its default prompt=none.
 */
export function mockDiscord(options: MockDiscordOptions = {}) {
	const { origin: configured, ...rest } = options;
	const base = `${mockBase(configured, "discord")}/api`;
	const tokenEndpoint = `${base}/oauth2/token`;
	const config = withMockClient(rest);
	const upstream = discord(config);
	const provider: typeof upstream = {
		...upstream,
		createAuthorizationURL: authorizationURL(
			upstream,
			base,
			"/oauth2/authorize",
		),
		// Like upstream, without PKCE: Better Auth's Discord provider doesn't send a challenge.
		validateAuthorizationCode: ({ code, redirectURI }) =>
			validateAuthorizationCode({
				code,
				redirectURI,
				options: config,
				tokenEndpoint,
			}),
		refreshAccessToken:
			config.refreshAccessToken ??
			((refreshToken) =>
				refreshMockAccessToken(refreshToken, config, tokenEndpoint, true)),
		async getUserInfo(token) {
			if (config.getUserInfo) return config.getUserInfo(token);
			const response = await fetch(`${base}/users/@me`, {
				headers: { authorization: `Bearer ${token.accessToken}` },
			});
			if (!response.ok) return null;
			const profile = (await response.json()) as DiscordProfile;
			if (profile.avatar === null) {
				const defaultAvatarNumber =
					profile.discriminator === "0"
						? Number(BigInt(profile.id) >> BigInt(22)) % 6
						: Number.parseInt(profile.discriminator, 10) % 5;
				profile.image_url = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
			} else {
				const format = profile.avatar.startsWith("a_") ? "gif" : "png";
				profile.image_url = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${format}`;
			}
			const userMap = await config.mapProfileToUser?.(profile);
			return {
				user: {
					name: profile.global_name || profile.username || "",
					email: profile.email,
					emailVerified: profile.verified,
					image: profile.image_url,
					...userMap,
				},
				data: profile,
			};
		},
	};
	return mockSocialPlugin(
		provider,
		"discord",
		"mockatoo-discord",
		config.disableImplicitSignUp,
	);
}
