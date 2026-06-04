export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent("session-expired"));
    return response;
  }

  return response;
}
