/**
 * The Better Auth setup of a typical SaaS: email and password with email
 * verification, the five social providers, and accounts linked by email.
 * Outside production it also offers Mockatoo's own sign-in. It is written the way the
 * provider-fidelity docs tell an app to adopt the mock, so the tests run an
 * app's real configuration rather than one assembled for the test.
 */
import {
	createMockatooPlugin,
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

export type SaasOptions = {
	baseURL: string;
	secret?: string;
	/** The app's own mailer, which sends email verification links. */
	sendEmail: (email: {
		to: string;
		subject: string;
		text: string;
	}) => Promise<void>;
	/** Points the providers at Mockatoo instead of the real ones. */
	mock?: { origin: string };
};

export function createSaasAuth({
	baseURL,
	secret = "saas-secret-at-least-thirty-two-characters",
	sendEmail,
	mock,
}: SaasOptions) {
	const google = {
		clientId: process.env.GOOGLE_CLIENT_ID ?? "",
		clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
	};
	const github = {
		clientId: process.env.GITHUB_CLIENT_ID ?? "",
		clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
	};
	const microsoft = {
		clientId: process.env.MICROSOFT_CLIENT_ID ?? "",
		clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
		tenantId: "common",
	};
	const apple = {
		clientId: process.env.APPLE_CLIENT_ID ?? "",
		clientSecret: process.env.APPLE_CLIENT_SECRET ?? "",
	};
	const discord = {
		clientId: process.env.DISCORD_CLIENT_ID ?? "",
		clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
	};
	const linkedin = {
		clientId: process.env.LINKEDIN_CLIENT_ID ?? "",
		clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
	};
	const twitter = {
		clientId: process.env.TWITTER_CLIENT_ID ?? "",
		clientSecret: process.env.TWITTER_CLIENT_SECRET ?? "",
	};
	const facebook = {
		clientId: process.env.FACEBOOK_CLIENT_ID ?? "",
		clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? "",
	};
	const database = {
		user: [] as Record<string, unknown>[],
		session: [] as Record<string, unknown>[],
		account: [] as Record<string, unknown>[],
		verification: [] as Record<string, unknown>[],
	};
	const auth = betterAuth({
		baseURL,
		secret,
		database: memoryAdapter(database),
		emailAndPassword: { enabled: true },
		emailVerification: {
			sendOnSignUp: true,
			sendVerificationEmail: ({ user, url }) =>
				sendEmail({
					to: user.email,
					subject: "Verify your email",
					text: `Verify your email: ${url}`,
				}),
		},
		account: {
			accountLinking: {
				enabled: true,
				trustedProviders: ["google", "github"],
			},
		},
		// Better Auth turns its origin check off when NODE_ENV is test.
		// Production keeps it on, so the tests do too.
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
					// Lets developers and agents sign in with any Mockatoo account.
					createMockatooPlugin({ origin: mock.origin }),
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
