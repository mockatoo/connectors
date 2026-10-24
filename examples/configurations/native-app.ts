/**
 * The Better Auth backend of a mobile app. The app signs in with the
 * platform's SDK (Sign in with Apple, Google Sign-In, MSAL) and sends the ID
 * token to the backend, which verifies it and starts a session.
 */
import {
	mockApple,
	mockGoogle,
	mockMicrosoft,
} from "@mockatoo/connect-better-auth";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";

export function createNativeAppAuth({
	baseURL,
	mock,
}: {
	baseURL: string;
	mock?: { origin: string };
}) {
	const apple = {
		clientId: process.env.APPLE_SERVICE_ID ?? "",
		clientSecret: process.env.APPLE_CLIENT_SECRET ?? "",
		// ID tokens from the iOS app carry its bundle ID as the audience.
		appBundleIdentifier: process.env.APPLE_BUNDLE_ID ?? "",
	};
	const google = {
		clientId: process.env.GOOGLE_CLIENT_ID ?? "",
		clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
	};
	const microsoft = {
		clientId: process.env.MICROSOFT_CLIENT_ID ?? "",
		clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
		tenantId: "common",
	};
	const database = {
		user: [] as Record<string, unknown>[],
		session: [] as Record<string, unknown>[],
		account: [] as Record<string, unknown>[],
		verification: [] as Record<string, unknown>[],
	};
	const auth = betterAuth({
		baseURL,
		secret: "native-secret-at-least-thirty-two-characters",
		database: memoryAdapter(database),
		socialProviders: mock ? {} : { apple, google, microsoft },
		plugins: mock
			? [
					mockApple({ ...apple, origin: mock.origin }),
					mockGoogle({ ...google, origin: mock.origin }),
					mockMicrosoft({ ...microsoft, origin: mock.origin }),
				]
			: [],
	});
	return { auth, database };
}
