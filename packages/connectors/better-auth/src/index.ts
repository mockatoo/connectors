import { genericOAuth } from "better-auth/plugins";
import { MOCK_CLIENT, MOCK_ORIGIN } from "./shared";

export type MockOauthPlugin = ReturnType<typeof genericOAuth<"oauth-mock">>;

export { MOCK_ORIGIN };
/** Override the origin only when running a local or self-hosted provider. */
export function createMockOauthPlugin(
	options: { origin?: string; redirectURI?: string } = {},
): MockOauthPlugin {
	const origin = new URL(options.origin ?? MOCK_ORIGIN).origin;
	return genericOAuth({
		config: [
			{
				providerId: "oauth-mock",
				...MOCK_CLIENT,
				authorizationUrl: `${origin}/oauth/authorize`,
				tokenUrl: `${origin}/oauth/token`,
				userInfoUrl: `${origin}/oauth/userinfo`,
				scopes: ["openid", "profile", "email"],
				pkce: true,
				...(options.redirectURI ? { redirectURI: options.redirectURI } : {}),
				accountSubject: ({ profile }) => String(profile.sub),
				mapProfileToUser: async (profile) => ({
					name: typeof profile.name === "string" ? profile.name : "",
					email: String(profile.email),
					emailVerified: profile.email_verified === true,
				}),
			},
		],
	});
}
export const mockOauthPlugin: MockOauthPlugin = createMockOauthPlugin();
export default mockOauthPlugin;
export { type MockAppleOptions, mockApple } from "./apple";
export { type MockDiscordOptions, mockDiscord } from "./discord";
export { type MockFacebookOptions, mockFacebook } from "./facebook";
export { type MockGitHubOptions, mockGitHub } from "./github";
export { type MockGoogleOptions, mockGoogle } from "./google";
export { type MockLinkedInOptions, mockLinkedIn } from "./linkedin";
export { type MockMicrosoftOptions, mockMicrosoft } from "./microsoft";
export { type MockTwitterOptions, mockTwitter } from "./twitter";
