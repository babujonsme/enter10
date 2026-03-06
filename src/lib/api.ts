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
      const errorData = await res.json();
      errorMessage = errorData.error || res.statusText;
    } catch (e) {
      // If json parsing fails, try to get text
      const textError = await res.text();
      errorMessage = textError || res.statusText;
    }
    throw new Error(errorMessage);
  }
  return res.json();
}
