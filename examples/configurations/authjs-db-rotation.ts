/**
 * An Auth.js app with a database adapter and the refresh-token rotation from
 * the Auth.js guide (authjs.dev/guides/refresh-token-rotation): the session
 * callback refreshes the user's expired Google access token. Google and
 * GitHub accounts with the same email join one user.
 */
import type { AuthConfig } from "@auth/core";
import { UnstorageAdapter } from "@auth/unstorage-adapter";
import {
	MockGitHub,
	MockGoogle,
	MockMicrosoftEntraID,
} from "@oauth-mock/connect-authjs";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { createStorage } from "unstorage";

/** The token URL the guide's rotation code posts to. */
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

type StoredAccount = {
	userId: string;
	provider: string;
	providerAccountId: string;
	access_token?: string;
	refresh_token?: string;
	expires_at?: number;
};

export function createAuthJsDbConfig({
	mock,
	googleTokenUrl = GOOGLE_TOKEN_URL,
}: {
	mock?: { origin: string };
	/** Where rotation refreshes Google tokens; the mock's when testing. */
	googleTokenUrl?: string;
}) {
	const storage = createStorage();
	const google = {
		clientId: process.env.AUTH_GOOGLE_ID,
		clientSecret: process.env.AUTH_GOOGLE_SECRET,
		authorization: {
			params: { access_type: "offline", prompt: "consent" },
		},
		allowDangerousEmailAccountLinking: true,
	};
	const github = { allowDangerousEmailAccountLinking: true };
	const origin = mock?.origin;

	/** The user's stored Google account, which the adapter keys by provider. */
	async function googleAccount(userId: string) {
		const keys = await storage.getKeys("user:account:google:");
		for (const key of keys) {
			const account = await storage.getItem<StoredAccount>(key);
			if (account?.userId === userId) return { key, account };
		}
	}

	const config: AuthConfig = {
		secret: "authjs-db-secret-at-least-thirty-two-characters",
		trustHost: true,
		basePath: "/api/auth",
		adapter: UnstorageAdapter(storage),
		providers: mock
			? [
					MockGoogle({ ...google, origin }),
					MockGitHub({ ...github, origin }),
					MockMicrosoftEntraID({ origin }),
				]
			: [Google(google), GitHub(github), MicrosoftEntraID],
		callbacks: {
			async session({ session, user }) {
				const found = await googleAccount(user.id);
				if (!found) return session;
				const { key, account } = found;
				if ((account.expires_at ?? 0) * 1000 >= Date.now()) return session;
				// The access token has expired: refresh it, as in the guide.
				try {
					if (!account.refresh_token) throw new Error("Missing refresh_token");
					const response = await fetch(googleTokenUrl, {
						method: "POST",
						body: new URLSearchParams({
							client_id: mock ? "oauth-mock" : (google.clientId ?? ""),
							client_secret: mock
								? "oauth-mock-secret"
								: (google.clientSecret ?? ""),
							grant_type: "refresh_token",
							refresh_token: account.refresh_token,
						}),
					});
					const tokens = (await response.json()) as {
						access_token: string;
						expires_in: number;
						refresh_token?: string;
					};
					if (!response.ok) throw tokens;
					await storage.setItem(key, {
						...account,
						access_token: tokens.access_token,
						expires_at: Math.floor(Date.now() / 1000 + tokens.expires_in),
						refresh_token: tokens.refresh_token ?? account.refresh_token,
					});
				} catch {
					// The guide flags the session so the app can ask the user to sign in again.
					return { ...session, error: "RefreshTokenError" };
				}
				return session;
			},
		},
	};
	return { config, storage, googleAccount };
}
