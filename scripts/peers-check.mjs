// Tests each connector against the versions of the auth library it plugs into:
// the oldest its peer range allows and the newest releases. Users install a
// connector next to whatever version they already have, and the normal tests
// only cover the one version in the lockfile.
//
// Each case gets its own copy of this folder, because it changes package.json
// and the lockfile. `latest` and `beta` resolve on npm when this runs.
// Usage: node scripts/peers-check.mjs [case-name-substring]
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const skip = new Set(["node_modules", "dist", ".pack", ".git", "coverage"]);

/** The newest version npm resolves `spec` to. */
function npmVersion(name, spec) {
	const out = JSON.parse(execFileSync("npm", ["view", `${name}@${spec}`, "version", "--json"], { encoding: "utf8" }));
	return Array.isArray(out) ? out.at(-1) : out;
}
/** The @auth/core version that `name@version` depends on. */
const authCoreOf = (name, version) =>
	execFileSync("npm", ["view", `${name}@${version}`, "dependencies.@auth/core"], { encoding: "utf8" }).trim();

const cases = [
	// The Better Auth connector supports better-auth ^1.4.15 (its peer range):
	// the floor, the newest release of each 1.x minor line, and latest.
	...["1.4.15", "~1.4", "~1.5", "~1.6", "~1.7", "latest"].map((spec) => ({
		name: `better-auth@${spec}`,
		pkg: "connect-better-auth",
		build: true,
		deps: () => [`better-auth@${npmVersion("better-auth", spec)}`],
	})),
	// The connector's floor is @auth/core 0.37.1, the version bundled by
	// next-auth 5.0.0-beta.23, the lowest next-auth tested. Check it and the newest beta.
	...["5.0.0-beta.23", "beta"].map((spec) => ({
		name: `next-auth@${spec}`,
		pkg: "connect-authjs",
		deps: () => {
			const version = npmVersion("next-auth", spec);
			return [`next-auth@${version}`, `@auth/core@${authCoreOf("next-auth", version)}`];
		},
	})),
	// SvelteKit apps have no next-auth, so drop it from devDependencies only
	// (`pnpm remove` would strip it from peerDependencies too, hiding a metadata mistake).
	{
		name: "@auth/sveltekit@latest",
		pkg: "connect-authjs",
		removeDev: ["next-auth"],
		deps: () => {
			const version = npmVersion("@auth/sveltekit", "latest");
			return [`@auth/sveltekit@${version}`, `@auth/core@${authCoreOf("@auth/sveltekit", version)}`];
		},
	},
];

const only = process.argv[2];
const failed = [];
for (const c of cases.filter((c) => !only || c.name.includes(only))) {
	const tmp = mkdtempSync(join(tmpdir(), "connectors-peers-"));
	const dir = join(tmp, "connectors");
	const run = (command, args, cwd = dir) => execFileSync(command, args, { cwd, stdio: "inherit" });
	try {
		const deps = c.deps();
		console.log(`\n=== ${c.name}: ${deps.join(" ")}`);
		cpSync(root, dir, { recursive: true, filter: (src) => !skip.has(basename(src)) });
		run("pnpm", ["install", "--frozen-lockfile"]);
		const pkgDir = join(dir, "packages", c.pkg);
		for (const dep of c.removeDev ?? []) run("npm", ["pkg", "delete", `devDependencies.${dep}`], pkgDir);
		run("pnpm", ["--filter", `@mockatoo/${c.pkg}`, "add", "-D", ...deps]);
		run("pnpm", ["--filter", `@mockatoo/${c.pkg}`, "typecheck"]);
		if (c.build) run("pnpm", ["--filter", `@mockatoo/${c.pkg}`, "build"]);
		run("pnpm", ["vitest", "run", `packages/${c.pkg}`]);
		console.log(`=== ${c.name}: passed`);
		rmSync(tmp, { recursive: true, force: true });
	} catch (error) {
		console.error(`=== ${c.name}: failed (copy kept in ${dir}): ${error.message}`);
		failed.push(c.name);
	}
}
if (failed.length) {
	console.error(`\npeers:check failed for: ${failed.join(", ")}`);
	process.exitCode = 1;
}
