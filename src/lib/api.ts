export async function fetcher(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    let errorMessage = 'An error occurred';
    try {
      // Read text first to avoid "body stream already read" if json() fails
      const text = await res.text();
      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.error || res.statusText;
      } catch {
        // If not JSON, use the text directly
        errorMessage = text || res.statusText;
      }
    } catch (e) {
      errorMessage = res.statusText;
    }
    throw new Error(errorMessage);
  }
  return res.json();
}
