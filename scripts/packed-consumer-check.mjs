// Packs each connector and typechecks a fresh npm consumer that uses
// "moduleResolution": "node" (node10), as older Next.js templates do. Node10
// ignores `exports`, so the package needs top-level `types`. Run after `pnpm build`.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Each consumer uses the connector as its README shows and lists exports whose
// types must not be `any`: skipLibCheck (on in Next.js templates) turns an
// unresolved import inside the connector's .d.mts into `any` instead of an error.
const consumers = {
	"connect-authjs": {
		source: `import NextAuth from "next-auth";
import { MockGitHub, MockGoogle } from "@mockatoo/connect-authjs";

export const { handlers, auth } = NextAuth({ providers: [MockGoogle(), MockGitHub()] });
`,
		typed: ["MockGoogle", "MockGitHub"],
		dependencies: ["next-auth@5.0.0-beta.23"],
	},
	"connect-better-auth": {
		source: `import { betterAuth } from "better-auth";
import { mockatoo, mockGoogle } from "@mockatoo/connect-better-auth";

export const auth = betterAuth({ plugins: [mockGoogle()] });
export const config = mockatoo();
`,
		typed: ["mockGoogle", "mockatoo"],
	},
};
const notAny = (name, typed) => `import type { ${typed.join(", ")} } from "${name}";

type IsAny<T> = 0 extends 1 & T ? true : false;
${typed.map((e) => `export const ${e}NotAny: IsAny<ReturnType<typeof ${e}>> = false;`).join("\n")}
`;
const tsconfig = {
	compilerOptions: {
		target: "es2022",
		lib: ["es2023", "dom", "dom.iterable"],
		module: "esnext",
		moduleResolution: "node",
		esModuleInterop: true,
		strict: true,
		noEmit: true,
		skipLibCheck: true,
	},
	include: ["*.ts"],
};

const run = (command, args, cwd) =>
	execFileSync(command, args, { cwd, stdio: ["ignore", "pipe", "inherit"], encoding: "utf8" });
let failed = false;
for (const [dir, { source, typed, dependencies = [] }] of Object.entries(consumers)) {
	const packageDir = resolve("packages", dir);
	const pkg = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
	const tmp = mkdtempSync(join(tmpdir(), `${dir}-consumer-`));
	run("pnpm", ["pack", "--pack-destination", tmp], packageDir);
	const tarball = join(tmp, `mockatoo-${dir}-${pkg.version}.tgz`);
	const consumer = join(tmp, "consumer");
	mkdirSync(consumer);
	writeFileSync(join(consumer, "package.json"), JSON.stringify({ name: "consumer", private: true }));
	writeFileSync(join(consumer, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));
	writeFileSync(join(consumer, "auth.ts"), source);
	writeFileSync(join(consumer, "types.ts"), notAny(pkg.name, typed));
	const peers = Object.entries(pkg.peerDependencies ?? {}).map(([name, range]) => `${name}@${range}`);
	run("npm", ["install", "--no-audit", "--no-fund", tarball, ...peers, ...dependencies, "typescript@5"], consumer);
	try {
		run("npx", ["tsc", "--noEmit", "-p", "."], consumer);
		console.log(`${pkg.name}: typechecks under moduleResolution "node"`);
		rmSync(tmp, { recursive: true, force: true });
	} catch (error) {
		console.error(`${pkg.name}: fails to typecheck under moduleResolution "node" (consumer kept in ${consumer})\n${error.stdout}`);
		failed = true;
	}
}
if (failed) process.exitCode = 1;
