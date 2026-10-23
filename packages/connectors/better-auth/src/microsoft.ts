import { type MicrosoftOptions, microsoft } from "better-auth/social-providers";
import {
	type MockOptions,
	mockBase,
	mockSocialPlugin,
	withMockClient,
} from "./shared";

export type MockMicrosoftOptions = MockOptions<MicrosoftOptions>;

/**
 * Better Auth's own `microsoft` social provider with its `authority` pointed at
 * the mock. Nothing else is replaced: the mock serves the same
 * `/{tenant}/oauth2/v2.0/...` paths as login.microsoftonline.com.
 */
export function mockMicrosoft(options: MockMicrosoftOptions = {}) {
	// A production client assertion would sign for Microsoft; the mock uses its shared secret.
	const { origin, clientAssertion: _, ...rest } = options;
	const provider = microsoft(
		withMockClient({
			...rest,
			authority: mockBase(origin, "login.microsoftonline.com"),
			// The photo is fetched from graph.microsoft.com, which cannot be redirected.
			disableProfilePhoto: true,
		}),
	);
	return mockSocialPlugin(
		provider,
		"microsoft",
		"oauth-mock-microsoft",
		rest.disableImplicitSignUp,
	);
}
