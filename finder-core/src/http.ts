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
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(buildBody(batch)),
    });

    if (!response.ok) {
      const body = await response.text();
      allResults.push(...buildErrorResults(batch, `HTTP ${response.status}: ${body}`));
      continue;
    }

    const json = await response.json();
    allResults.push(...parseResults(json));
  }

  return allResults;
}
