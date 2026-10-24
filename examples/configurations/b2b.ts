/**
 * A Better Auth app sold to companies: staff sign in with their work
 * accounts only. Microsoft is registered single-tenant (or for any work
 * account, `organizations`), and Google is limited to one Workspace domain.
 */
import { mockGoogle, mockMicrosoft } from "@mockatoo/connect-better-auth";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";

/** The customer's Microsoft Entra tenant. */
export const CUSTOMER_TENANT = "72f988bf-86f1-41af-91ab-2d7cd011db47";

export function createB2bAuth({
	baseURL,
	mock,
	tenantId = CUSTOMER_TENANT,
}: {
	baseURL: string;
	mock?: { origin: string };
	/** A tenant ID, or `organizations` to admit any work account. */
	tenantId?: string;
}) {
	const microsoft = {
		clientId: process.env.MICROSOFT_CLIENT_ID ?? "",
		clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
		tenantId,
	};
	const google = {
		clientId: process.env.GOOGLE_CLIENT_ID ?? "",
		clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
		hd: "example.com",
	};
	const database = {
		user: [] as Record<string, unknown>[],
		session: [] as Record<string, unknown>[],
		account: [] as Record<string, unknown>[],
		verification: [] as Record<string, unknown>[],
	};
	const auth = betterAuth({
		baseURL,
		secret: "b2b-secret-at-least-thirty-two-characters",
		database: memoryAdapter(database),
		advanced: { disableOriginCheck: false },
		socialProviders: mock ? {} : { microsoft, google },
		plugins: mock
			? [
					mockMicrosoft({ ...microsoft, origin: mock.origin }),
					mockGoogle({ ...google, origin: mock.origin }),
				]
			: [],
	});
	return { auth, database };
}
