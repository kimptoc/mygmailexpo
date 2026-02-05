export async function fetchWithBackoff(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  baseDelayMs = 400
): Promise<Response> {
  let attempt = 0;
  while (true) {
    const res = await fetch(url, options);
    if (res.ok) return res;

    const shouldRetry = res.status === 429 || res.status === 503 || res.status === 500;
    if (!shouldRetry || attempt >= maxRetries) {
      return res;
    }

    const delay = baseDelayMs * Math.pow(2, attempt);
    await new Promise(resolve => setTimeout(resolve, delay));
    attempt += 1;
  }
}
