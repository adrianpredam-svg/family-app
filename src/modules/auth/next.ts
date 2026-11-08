// Where to send someone after login. Only our own sites are allowed (no open redirects).
export function safeNext(next: string | undefined | null, appUrl?: string, cookieDomain?: string): string {
  if (!next) return "/";
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  try {
    const url = new URL(next);
    if (url.protocol !== "https:") return "/";
    const appHost = appUrl ? new URL(appUrl).host : undefined;
    const domain = cookieDomain?.replace(/^\./, "");
    if (url.host === appHost) return url.href;
    if (domain && (url.hostname === domain || url.hostname.endsWith(`.${domain}`))) return url.href;
  } catch {}
  return "/";
}
