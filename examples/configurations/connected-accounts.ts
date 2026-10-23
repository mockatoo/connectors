/**
 * A Better Auth app that signs users in to use their provider data later:
 * it keeps refresh tokens, asks for API scopes, and calls provider APIs with
 * the stored tokens (a calendar, a repository list, a mailbox, a server list).
 */
import {
	mockApple,
	mockDiscord,
	mockFacebook,
	mockGitHub,
	mockGoogle,
	mockLinkedIn,
	mockMicrosoft,
	mockTwitter,
} from "@oauth-mock/connect-better-auth";

type NamedProvider =
	| "google"
	| "github"
	| "microsoft"
	| "apple"
	| "discord"
	| "linkedin"
	| "x"
	| "facebook";

import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";

export const GOOGLE_CALENDAR_SCOPE =
	"https://www.googleapis.com/auth/calendar.readonly";

export function createConnectedAccountsAuth({
	baseURL,
	mock,
	consentEveryTime = true,
	scopes = {},
}: {
	baseURL: string;
	mock?: { origin: string };
	/** Off for apps that ask for offline access but not prompt=consent. */
	consentEveryTime?: boolean;
	/** Extra scopes per provider, in place of the app's usual ones. */
	scopes?: Partial<Record<NamedProvider, string[]>>;
}) {
	const google = {
		clientId: process.env.GOOGLE_CLIENT_ID ?? "",
		clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
		// A refresh token, so the app can read the calendar while the user is
		// away. Google sends one to a returning user only with prompt=consent.
		accessType: "offline" as const,
		...(consentEveryTime ? { prompt: "select_account consent" as const } : {}),
		scope: scopes.google ?? [],
	};
	const github = {
		clientId: process.env.GITHUB_CLIENT_ID ?? "",
		clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
		scope: scopes.github ?? ["repo"],
	};
	const microsoft = {
		clientId: process.env.MICROSOFT_CLIENT_ID ?? "",
		clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
		tenantId: "common",
		scope: scopes.microsoft ?? ["Calendars.Read", "Mail.Read"],
	};
	const apple = {
		clientId: process.env.APPLE_CLIENT_ID ?? "",
		clientSecret: process.env.APPLE_CLIENT_SECRET ?? "",
		scope: scopes.apple ?? [],
	};
	const discord = {
		clientId: process.env.DISCORD_CLIENT_ID ?? "",
		clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
		scope: scopes.discord ?? ["guilds"],
	};
	const linkedin = {
		clientId: process.env.LINKEDIN_CLIENT_ID ?? "",
		clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
		scope: scopes.linkedin ?? ["w_member_social"],
	};
	const twitter = {
		clientId: process.env.TWITTER_CLIENT_ID ?? "",
		clientSecret: process.env.TWITTER_CLIENT_SECRET ?? "",
		scope: scopes.x ?? ["tweet.write"],
	};
	const facebook = {
		clientId: process.env.FACEBOOK_CLIENT_ID ?? "",
		clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? "",
		scope: scopes.facebook ?? [],
	};
	const database = {
		user: [] as Record<string, unknown>[],
		session: [] as Record<string, unknown>[],
		account: [] as Record<string, unknown>[],
		verification: [] as Record<string, unknown>[],
	};
	const auth = betterAuth({
		baseURL,
		secret: "connected-secret-at-least-thirty-two-characters",
		database: memoryAdapter(database),
		advanced: { disableOriginCheck: false },
		socialProviders: mock
			? {}
			: {
					google,
					github,
					microsoft,
					apple,
					discord,
					linkedin,
					twitter,
					facebook,
				},
		plugins: mock
			? [
					mockGoogle({ ...google, origin: mock.origin }),
					mockGitHub({ ...github, origin: mock.origin }),
					mockMicrosoft({ ...microsoft, origin: mock.origin }),
					mockApple({ ...apple, origin: mock.origin }),
					mockDiscord({ ...discord, origin: mock.origin }),
					mockLinkedIn({ ...linkedin, origin: mock.origin }),
					mockTwitter({ ...twitter, origin: mock.origin }),
					mockFacebook({ ...facebook, origin: mock.origin }),
				]
			: [],
	});
	return { auth, database };
}

type Auth = ReturnType<typeof createConnectedAccountsAuth>["auth"];

/** The app's own API calls, made with the signed-in user's stored tokens. */
export const API_CALLS = {
	google: "https://www.googleapis.com/calendar/v3/users/me/calendarList",
	github: "https://api.github.com/user/repos",
	microsoft: "https://graph.microsoft.com/v1.0/me/events",
	discord: "https://discord.com/api/users/@me/guilds",
	twitter: "https://api.x.com/2/tweets/search/recent?query=oauth",
} as const;

/**
 * Calls a provider API for the user, as the app's features do. Better Auth
 * refreshes an expired access token before handing it out.
 */
export async function callProviderApi(
	auth: Auth,
	headers: Headers,
	provider: keyof typeof API_CALLS,
) {
	const accounts = await auth.api.listUserAccounts({ headers });
	const account = accounts.find((a) => a.providerId === provider);
	if (!account) return { ok: false, status: 0 };
	const { accessToken } = await auth.api.getAccessToken({
		headers,
		body: { accountId: account.id },
	});
	return callWithAccessToken(provider, accessToken);
}

/** The API request is the same whichever library manages the token. */
export async function callWithAccessToken(
	provider: keyof typeof API_CALLS,
	accessToken: string,
) {
	try {
		const response = await fetch(API_CALLS[provider], {
			headers: { authorization: `Bearer ${accessToken}` },
		});
		return { ok: response.ok, status: response.status };
	} catch {
		return { ok: false, status: 0 };
	}
}
