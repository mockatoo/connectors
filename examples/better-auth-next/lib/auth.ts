import { createSaasAuth } from "../../configurations/saas";

/**
 * This example uses the same Better Auth setup shown in the configuration
 * examples, with mock credentials supplied for local development.
 */
function createAuth() {
	const origin =
		process.env.OAUTH_MOCK_URL ??
		`https://localhost:${process.env.OAUTH_MOCK_PORT || "4001"}`;
	const { auth } = createSaasAuth({
		baseURL:
			process.env.EXAMPLE_URL ??
			`https://localhost:${process.env.EXAMPLE_PORT || "4002"}`,
		secret:
			process.env.BETTER_AUTH_SECRET ??
			"example-only-auth-secret-at-least-32-characters",
		mock: { origin },
		// This demo has no mailer; the verification link only appears in the log.
		sendEmail: async (email) =>
			console.log(`[email to ${email.to}] ${email.text}`),
	});
	return auth;
}
const state = globalThis as typeof globalThis & {
	exampleAuth?: ReturnType<typeof createAuth>;
};
export function getAuth() {
	state.exampleAuth ??= createAuth();
	return state.exampleAuth;
}
