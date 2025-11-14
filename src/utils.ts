// Used for converting a username into a pseudonymous ID for logging workshop check-ins
// Source: https://gist.github.com/technikhil314/40f3c41e1039f4c7964843e47a9f25fc
export async function hashString(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}
