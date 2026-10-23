import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";
import MicrosoftEntraID, {
	type MicrosoftEntraIDProfile,
} from "next-auth/providers/microsoft-entra-id";
import { MOCK_CLIENT, mockBase } from "./shared";

export type MockMicrosoftEntraIDOptions = Partial<
	OAuthUserConfig<MicrosoftEntraIDProfile>
> &
	Pick<Parameters<typeof MicrosoftEntraID>[0], "profilePhotoSize"> & {
		/** Override only for a local or self-hosted provider. */
		origin?: string;
	};

/**
 * Auth.js's own Microsoft Entra ID provider, pointed at the mock's issuer for
 * the same tenant as the production issuer (`common` by default).
 */
export function MockMicrosoftEntraID(
	options: MockMicrosoftEntraIDOptions = {},
): OAuthConfig<MicrosoftEntraIDProfile> {
	const { origin, issuer, ...rest } = options;
	const production = issuer ?? process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ?? "";
	const tenant =
		production.match(/microsoftonline\.com\/([^/]+)\/v2\.0/)?.[1] ?? "common";
	return MicrosoftEntraID({
		...rest,
		...MOCK_CLIENT,
		issuer: `${mockBase(origin, "login.microsoftonline.com")}/${tenant}/v2.0`,
		// Upstream also fetches the photo from graph.microsoft.com, which cannot be
		// redirected; this is its profile mapping without that request.
		profile:
			rest.profile ??
			((profile) => ({
				id: profile.sub,
				name: profile.name,
				email: profile.email,
				image: null,
			})),
	});
}
