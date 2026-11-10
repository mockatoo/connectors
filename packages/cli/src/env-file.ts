/**
 * Sets variables in an env file's text. Existing lines for the keys are
 * replaced in place; other lines, comments, and key order are kept.
 */
export function setEnvValues(
	source: string,
	values: Record<string, string>,
): string {
	const pending = new Map(Object.entries(values));
	const lines = source === "" ? [] : source.replace(/\n$/, "").split("\n");
	const updated = lines.map((line) => {
		const key = line.match(
			/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/,
		)?.[1];
		if (!key || !pending.has(key)) return line;
		const value = pending.get(key) as string;
		pending.delete(key);
		return `${key}=${quote(value)}`;
	});
	for (const [key, value] of pending) updated.push(`${key}=${quote(value)}`);
	return `${updated.join("\n")}\n`;
}

/** Plain values stay bare; anything else is double-quoted and escaped. */
function quote(value: string): string {
	return /^[\w@.+-]*$/.test(value) ? value : JSON.stringify(value);
}
