/**
 * A Better Auth app for invited users only, such as an internal tool. An
 * admin invites people by email; they sign in with a provider that confirms
 * that email. Nobody else can create an account, and a provider sign-in only
 * joins an existing account when the provider says the email is verified.
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
} from "@mockatoo/connect-better-auth";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { admin } from "better-auth/plugins";

export function createStrictLinkingAuth({
	baseURL,
	mock,
}: {
	baseURL: string;
	mock?: { origin: string };
}) {
	const inviteOnly = { disableImplicitSignUp: true };
	const google = {
		clientId: process.env.GOOGLE_CLIENT_ID ?? "",
		clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
		...inviteOnly,
	};
	const github = {
		clientId: process.env.GITHUB_CLIENT_ID ?? "",
		clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
		...inviteOnly,
	};
	const microsoft = {
		clientId: process.env.MICROSOFT_CLIENT_ID ?? "",
		clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
		tenantId: "common",
		...inviteOnly,
	};
	const apple = {
		clientId: process.env.APPLE_CLIENT_ID ?? "",
		clientSecret: process.env.APPLE_CLIENT_SECRET ?? "",
		...inviteOnly,
	};
	const discord = {
		clientId: process.env.DISCORD_CLIENT_ID ?? "",
		clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
		...inviteOnly,
	};
	const linkedin = {
		clientId: process.env.LINKEDIN_CLIENT_ID ?? "",
		clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
		...inviteOnly,
	};
	const twitter = {
		clientId: process.env.TWITTER_CLIENT_ID ?? "",
		clientSecret: process.env.TWITTER_CLIENT_SECRET ?? "",
		...inviteOnly,
	};
	const facebook = {
		clientId: process.env.FACEBOOK_CLIENT_ID ?? "",
		clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? "",
		...inviteOnly,
	};
	const database = {
		user: [] as Record<string, unknown>[],
		session: [] as Record<string, unknown>[],
		account: [] as Record<string, unknown>[],
		verification: [] as Record<string, unknown>[],
	};
	const auth = betterAuth({
		baseURL,
		secret: "strict-secret-at-least-thirty-two-characters",
		database: memoryAdapter(database),
		account: {
			// No trusted providers: link only emails the provider says are verified.
			accountLinking: { enabled: true, trustedProviders: [] },
		},
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
		plugins: [
			// Admins invite users; see invite() below.
			admin(),
			...(mock
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
				: []),
		],
	});

	/** The admin's invite: an account for the address, with its email confirmed. */
	async function invite(email: string) {
		await auth.api.createUser({
			body: { email, name: "", data: { emailVerified: true } },
		});
	}
	return { auth, database, invite };
}
