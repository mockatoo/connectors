import type { OAuthConfig } from "next-auth/providers";
import { MOCK_CLIENT, mockOrigin } from "./shared";
export type MockProfile = {
	sub: string;
	name: string;
	email: string;
	picture?: string;
	email_verified: boolean;
};
/** Auth.js derives its callback URL from the application configuration. */
export default function MockatooProvider(
	options: { origin?: string } = {},
): OAuthConfig<MockProfile> {
	const origin = mockOrigin(options.origin);
	return {
		id: "mockatoo",
		name: "Mockatoo",
		type: "oauth",
		...MOCK_CLIENT,
		authorization: {
			url: `${origin}/oauth/authorize`,
			params: { scope: "openid profile email" },
		},
		token: `${origin}/oauth/token`,
		userinfo: `${origin}/oauth/userinfo`,
		checks: ["pkce", "state"],
		profile: (profile) => ({
			id: profile.sub,
			name: profile.name,
			email: profile.email,
			image: profile.picture ?? null,
		}),
	};
}
export { MockApple, type MockAppleOptions } from "./apple";
export { MockDiscord, type MockDiscordOptions } from "./discord";
export { MockFacebook, type MockFacebookOptions } from "./facebook";
export { MockGitHub, type MockGitHubOptions } from "./github";
export { MockGoogle, type MockGoogleOptions } from "./google";
export { MockLinkedIn, type MockLinkedInOptions } from "./linkedin";
export {
	MockMicrosoftEntraID,
	type MockMicrosoftEntraIDOptions,
} from "./microsoft";
export { MockTwitter, type MockTwitterOptions } from "./twitter";
export { MockatooProvider };
