export function extractTextFromStructuredContent(raw: string): string {
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (typeof parsed === "object" && parsed !== null) {
			const record = parsed as Record<string, unknown>;
			const candidates = [
				record.text,
				record.contentText,
				record.body,
				record.title,
			].filter(
				(value): value is string =>
					typeof value === "string" && value.trim().length > 0,
			);
			if (candidates.length > 0) return candidates.join("\n\n");
		}
	} catch {
		// Fall through to HTML/plain text handling.
	}

	return stripHtmlToText(raw);
}

export function stripHtmlToText(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<style[\s\S]*?<\/style>/gi, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/\s+/g, " ")
		.trim();
}
