import { signOut } from "next-auth/react";

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401) {
    await signOut({ callbackUrl: "/login" });
    // Return the response anyway so callers don't crash while redirect happens
    return response;
  }

  return response;
}
