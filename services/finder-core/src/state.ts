import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function loadJsonState<T>(
	filePath: string,
	parse: (value: unknown) => T,
	createEmpty: () => T,
): Promise<T> {
	try {
		const raw = await readFile(filePath, "utf-8");
		return parse(JSON.parse(raw));
	} catch {
		return createEmpty();
	}
}

export async function saveJsonState<T>(
	filePath: string,
	state: T,
): Promise<void> {
	await mkdir(dirname(filePath), { recursive: true });
	await writeFile(filePath, JSON.stringify(state, null, 2), "utf-8");
}
