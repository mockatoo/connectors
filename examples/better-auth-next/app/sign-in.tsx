"use client";
import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";
import LoginDetails from "./login-details";
export default function SignIn() {
	const { data: session, isPending } = authClient.useSession();
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	useEffect(() => {
		const value = new URLSearchParams(window.location.search).get("error");
		if (value) setError(`Sign-in failed: ${value}`);
	}, []);
	// Better Auth names X by its old name.
	async function signIn(
		provider: Parameters<typeof authClient.signIn.social>[0]["provider"],
	) {
		setBusy(true);
		setError("");
		try {
			const result = await authClient.signIn.social({
				provider,
				callbackURL: "/",
				errorCallbackURL: "/",
			});
			if (result.error) setError(result.error.message ?? "Sign-in failed");
		} catch {
			setError("Sign-in is unavailable. Please try again.");
		} finally {
			setBusy(false);
		}
	}
	async function signOut() {
		setBusy(true);
		setError("");
		try {
			const result = await authClient.signOut();
			if (result.error) setError(result.error.message ?? "Sign-out failed");
		} catch {
			setError("Sign-out is unavailable. Please try again.");
		} finally {
			setBusy(false);
		}
	}
	return (
		<section aria-label="Application session">
			{isPending ? (
				<p>Checking session…</p>
			) : session ? (
				<>
					<h2>Signed in</h2>
					<p>
						{session.user.name || "(no name)"} · {session.user.email}
					</p>
					<button type="button" disabled={busy} onClick={signOut}>
						Sign out
					</button>
					<LoginDetails sessionId={session.session.id} />
				</>
			) : (
				<>
					<p>You are signed out.</p>
					<div className="sign-in-options">
						<button
							type="button"
							disabled={busy}
							onClick={() => signIn("mockatoo")}
						>
							Sign in with Mockatoo
						</button>
						<button
							type="button"
							disabled={busy}
							onClick={() => signIn("google")}
						>
							Sign in with Google
						</button>
						<button
							type="button"
							disabled={busy}
							onClick={() => signIn("microsoft")}
						>
							Sign in with Microsoft
						</button>
						<button
							type="button"
							disabled={busy}
							onClick={() => signIn("github")}
						>
							Sign in with GitHub
						</button>
						<button
							type="button"
							disabled={busy}
							onClick={() => signIn("apple")}
						>
							Sign in with Apple
						</button>
						<button
							type="button"
							disabled={busy}
							onClick={() => signIn("discord")}
						>
							Sign in with Discord
						</button>
						<button
							type="button"
							disabled={busy}
							onClick={() => signIn("linkedin")}
						>
							Sign in with LinkedIn
						</button>
						<button
							type="button"
							disabled={busy}
							onClick={() => signIn("twitter")}
						>
							Sign in with X
						</button>
						<button
							type="button"
							disabled={busy}
							onClick={() => signIn("facebook")}
						>
							Sign in with Facebook
						</button>
					</div>
				</>
			)}
			{error && <p role="alert">{error}</p>}
		</section>
	);
}
