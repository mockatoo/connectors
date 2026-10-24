"use client";
import { useEffect, useState } from "react";

type Account = {
	providerId: string;
	accountId: string;
	scope: string | null;
	hasRefreshToken: boolean;
	accessTokenExpiresAt: string | null;
	updatedAt: string;
	idTokenClaims: Record<string, unknown> | null;
};
type LoginInfo = {
	user: {
		id: string;
		name: string;
		email: string;
		emailVerified: boolean;
		image?: string | null;
	};
	accounts: Account[];
};

const PROVIDERS: Record<string, string> = {
	mockatoo: "Mockatoo",
	google: "Google",
	microsoft: "Microsoft",
	github: "GitHub",
	apple: "Apple",
	discord: "Discord",
	linkedin: "LinkedIn",
	twitter: "X",
	facebook: "Facebook",
};
const yesNo = (value: boolean) => (value ? "Yes" : "No");
const time = (value: string | null) =>
	value ? new Date(value).toLocaleString() : "—";
const TIMESTAMP_CLAIMS = new Set(["iat", "exp", "auth_time"]);
const claim = (name: string, value: unknown) =>
	TIMESTAMP_CLAIMS.has(name) && typeof value === "number"
		? `${value} (${new Date(value * 1000).toLocaleString()})`
		: show(value);
const show = (value: unknown) =>
	value === "" || value === null || value === undefined
		? "(none)"
		: typeof value === "string"
			? value
			: JSON.stringify(value);

function Fields({ rows }: { rows: [string, React.ReactNode][] }) {
	return (
		<dl className="details">
			{rows.map(([label, value]) => (
				<div key={label}>
					<dt>{label}</dt>
					<dd>{value}</dd>
				</div>
			))}
		</dl>
	);
}

/** What the app received from the provider, to check special test addresses. */
export default function LoginDetails({ sessionId }: { sessionId: string }) {
	const [info, setInfo] = useState<LoginInfo | null>(null);
	const [failed, setFailed] = useState(false);
	useEffect(() => {
		if (!sessionId) return;
		fetch("/api/login-info", { cache: "no-store" })
			.then((response) => (response.ok ? response.json() : Promise.reject()))
			.then(setInfo, () => setFailed(true));
	}, [sessionId]);
	if (failed) return <p role="alert">Login details are unavailable.</p>;
	if (!info) return <p>Loading login details…</p>;
	const [latest, ...others] = info.accounts;
	return (
		<div className="login-details">
			<h3>App user</h3>
			<Fields
				rows={[
					["Name", show(info.user.name)],
					["Email", info.user.email],
					["Email verified", yesNo(info.user.emailVerified)],
					["User ID", <code key="id">{info.user.id}</code>],
					[
						"Image",
						info.user.image ? (
							<a key="img" href={info.user.image}>
								{info.user.image}
							</a>
						) : (
							"(none)"
						),
					],
				]}
			/>
			{latest && (
				<>
					<h3>Latest provider sign-in</h3>
					<Fields
						rows={[
							["Provider", PROVIDERS[latest.providerId] ?? latest.providerId],
							["Provider user ID", <code key="sub">{latest.accountId}</code>],
							["Scopes", show(latest.scope?.split(",").join(", "))],
							["Refresh token stored", yesNo(latest.hasRefreshToken)],
							["Access token expires", time(latest.accessTokenExpiresAt)],
							["Signed in at", time(latest.updatedAt)],
						]}
					/>
					<p className="hint">
						Better Auth keeps a refresh token from an earlier sign-in when the
						provider doesn’t send a new one.
					</p>
					<h3>ID token claims</h3>
					{latest.idTokenClaims ? (
						<Fields
							rows={Object.entries(latest.idTokenClaims).map(
								([name, value]) => [
									name,
									<code key={name}>{claim(name, value)}</code>,
								],
							)}
						/>
					) : (
						<p>
							No ID token. This provider sends the profile from its userinfo or
							user API instead.
						</p>
					)}
				</>
			)}
			{others.length > 0 && (
				<>
					<h3>Other linked accounts</h3>
					<Fields
						rows={others.map((account) => [
							PROVIDERS[account.providerId] ?? account.providerId,
							<code key={account.accountId}>{account.accountId}</code>,
						])}
					/>
				</>
			)}
		</div>
	);
}
