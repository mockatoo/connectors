/**
 * An Auth.js (NextAuth v5) app with its defaults: JWT sessions in a cookie
 * and no database. Each provider is the one from `next-auth/providers`;
 * outside production the app swaps in the mock connector of the same name.
 */
import type { AuthConfig } from "@auth/core";
import {
	MockApple,
	MockatooProvider,
	MockGitHub,
	MockGoogle,
	MockMicrosoftEntraID,
} from "@mockatoo/connect-authjs";
import Apple from "next-auth/providers/apple";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

export function createAuthJsJwtConfig({
	mock,
	microsoftIssuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
}: {
	mock?: { origin: string };
	/** The Entra issuer, which names the app's tenant (`common` by default). */
	microsoftIssuer?: string;
}): AuthConfig {
	const origin = mock?.origin;
	return {
		secret: "authjs-secret-at-least-thirty-two-characters",
		trustHost: true,
		basePath: "/api/auth",
		providers: mock
			? [
					MockGoogle({ origin }),
					MockGitHub({ origin }),
					MockMicrosoftEntraID({ origin, issuer: microsoftIssuer }),
					MockApple({ origin }),
					// Lets developers and agents sign in with any Mockatoo account.
					MockatooProvider({ origin }),
				]
			: [Google, GitHub, MicrosoftEntraID({ issuer: microsoftIssuer }), Apple],
	};
}
