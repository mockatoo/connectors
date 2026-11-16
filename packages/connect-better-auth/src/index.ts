import { genericOAuth } from "better-auth/plugins";
import type { GenericOAuthConfig } from "better-auth/plugins/generic-oauth";
import { MOCK_CLIENT, MOCK_ORIGIN, MOCKATOO_URL } from "./shared";

export type MockatooPlugin = ReturnType<typeof genericOAuth<"mockatoo">>;

export { MOCK_ORIGIN, MOCKATOO_URL };

/**
 * Configure Mockatoo as a generic OAuth provider.
 *
 * @example
 * genericOAuth({ config: [mockatoo()] });
 */
export function mockatoo(
	options: { redirectURI?: string } = {},
): GenericOAuthConfig<"mockatoo"> {
	const origin = new URL(MOCKATOO_URL).origin;
	return {
		providerId: "mockatoo",
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
	};
}

export function createMockatooPlugin(
	options: { redirectURI?: string } = {},
): MockatooPlugin {
	return genericOAuth({ config: [mockatoo(options)] });
}
export const mockatooPlugin: MockatooPlugin = createMockatooPlugin();
export default mockatooPlugin;
export { type MockAppleOptions, mockApple } from "./apple";
export { type MockDiscordOptions, mockDiscord } from "./discord";
export { type MockFacebookOptions, mockFacebook } from "./facebook";
export { type MockGitHubOptions, mockGitHub } from "./github";
export { type MockGoogleOptions, mockGoogle } from "./google";
export { type MockLinkedInOptions, mockLinkedIn } from "./linkedin";
export { type MockMicrosoftOptions, mockMicrosoft } from "./microsoft";
export { type MockTwitterOptions, mockTwitter } from "./twitter";
