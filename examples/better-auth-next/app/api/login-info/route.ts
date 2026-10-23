import { getAuth } from "../../../lib/auth";

export const runtime = "nodejs";

/** Decodes ID token claims for display only; Better Auth already validated the sign-in. */
function claims(idToken: string): Record<string, unknown> | null {
	try {
		return JSON.parse(
			Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString(),
		);
	} catch {
		return null;
	}
}

/**
 * What the app received from the provider, so special test addresses can be
 * checked by eye. Token values are never returned, only whether they exist.
 */
export async function GET(request: Request) {
	const auth = getAuth();
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session)
		return Response.json({ error: "Not signed in" }, { status: 401 });
	const context = await auth.$context;
	const accounts = await context.internalAdapter.findAccounts(session.user.id);
	return Response.json(
		{
			user: session.user,
			accounts: accounts
				.sort(
					(a, b) =>
						new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
				)
				.map((account) => ({
					providerId: account.providerId,
					accountId: account.accountId,
					scope: account.scope ?? null,
					hasRefreshToken: Boolean(account.refreshToken),
					accessTokenExpiresAt: account.accessTokenExpiresAt ?? null,
					updatedAt: account.updatedAt,
					idTokenClaims: account.idToken ? claims(account.idToken) : null,
				})),
		},
		{ headers: { "cache-control": "no-store" } },
	);
}
