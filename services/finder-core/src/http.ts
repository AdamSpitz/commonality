export interface PostJsonCandidateParams<TRequest> {
	endpointUrl: string;
	body: TRequest;
	headers?: Record<string, string>;
	fetchImpl?: typeof fetch;
}

export async function postJsonCandidate<TRequest, TResponse>(
	params: PostJsonCandidateParams<TRequest>,
): Promise<TResponse> {
	const fetchImpl = params.fetchImpl ?? fetch;
	const response = await fetchImpl(params.endpointUrl, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			...params.headers,
		},
		body: JSON.stringify(params.body),
	});

	if (!response.ok) {
		throw new Error(
			`Finder candidate submission failed with HTTP ${response.status}`,
		);
	}

	return (await response.json()) as TResponse;
}

export async function postJsonInBatches<TInput, TResult>(params: {
	items: TInput[];
	maxBatchSize: number;
	endpointUrl: string;
	headers?: Record<string, string>;
	buildBody: (batch: TInput[]) => unknown;
	parseResults: (json: unknown) => TResult[];
	buildErrorResults: (batch: TInput[], errorMessage: string) => TResult[];
}): Promise<TResult[]> {
	const {
		items,
		maxBatchSize,
		endpointUrl,
		headers,
		buildBody,
		parseResults,
		buildErrorResults,
	} = params;
	const allResults: TResult[] = [];

	for (let index = 0; index < items.length; index += maxBatchSize) {
		const batch = items.slice(index, index + maxBatchSize);
		const response = await fetch(endpointUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...headers,
			},
			body: JSON.stringify(buildBody(batch)),
		});

		if (!response.ok) {
			const body = await response.text();
			allResults.push(
				...buildErrorResults(batch, `HTTP ${response.status}: ${body}`),
			);
			continue;
		}

		const json = await response.json();
		allResults.push(...parseResults(json));
	}

	return allResults;
}
