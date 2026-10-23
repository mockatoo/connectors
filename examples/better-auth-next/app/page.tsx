import SignIn from "./sign-in";
export const dynamic = "force-dynamic";

export default function Page() {
	return (
		<main>
			<header className="app-header">
				<span className="app-mark" aria-hidden="true">
					EX
				</span>
				<div>
					<span className="app-name">Example application</span>
					<span className="app-label">Next.js · Better Auth</span>
				</div>
			</header>
			<h1>Try signing in</h1>
			<p>
				This is the app you sign in to. The orange Mockatoo provider handles
				your test credentials; your application session lives here.
			</p>
			<SignIn />
		</main>
	);
}
