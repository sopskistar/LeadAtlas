import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import ipaddr from "ipaddr.js";
import { deadline } from "../lib/core/deadline";
export function publicIp(address: string) {
  try {
    const parsed = ipaddr.process(address);
    return parsed.range() === "unicast";
  } catch {
    return false;
  }
}
export function publicUrl(value: string) {
  const url = new URL(value);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port))
  )
    throw new Error("Unsafe URL scheme, credentials or port");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    !host.includes(".") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    (ipaddr.isValid(host) && !publicIp(host))
  )
    throw new Error("Private or local URL blocked");
  return url;
}
export async function safeFetch(
  value: string,
  allowedHosts: string[],
  maxBytes = 1_000_000,
  redirects = 0,
): Promise<{ status: number; body: string; url: string; contentType: string }> {
  const url = publicUrl(value);
  if (!allowedHosts.includes(url.hostname))
    throw new Error("Host is not authorized for research");
  const records = await deadline(
    lookup(url.hostname, { all: true, verbatim: true }),
    6000,
  );
  if (!records.length || records.some((r) => !publicIp(r.address)))
    throw new Error("Unsafe DNS resolution blocked");
  // Pin the already validated address into the actual connection. No second DNS lookup.
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        method: "GET",
        headers: {
          "User-Agent": "LeadAtlasResearch/1.0 (+https://leadatlas.xyz/terms)",
          Accept: "text/html,text/plain",
          "Accept-Encoding": "identity",
        },
        lookup: (_host, options, cb) => {
          if (options.all) cb(null, records);
          else cb(null, records[0].address, records[0].family);
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        if ([301, 302, 303, 307, 308].includes(status)) {
          response.resume();
          if (redirects >= 3 || !response.headers.location)
            return reject(new Error("Redirect limit exceeded"));
          safeFetch(
            new URL(response.headers.location, url).href,
            allowedHosts,
            maxBytes,
            redirects + 1,
          ).then(resolve, reject);
          return;
        }
        if (
          response.headers["content-encoding"] &&
          response.headers["content-encoding"] !== "identity"
        ) {
          response.destroy();
          reject(new Error("Compressed response refused"));
          return;
        }
        let bytes = 0;
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > maxBytes) {
            response.destroy();
            reject(new Error("Response size limit exceeded"));
          } else chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () =>
          resolve({
            status,
            body: Buffer.concat(chunks).toString("utf8"),
            url: url.href,
            contentType: String(response.headers["content-type"] ?? ""),
          }),
        );
      },
    );
    const timer = setTimeout(
      () => request.destroy(new Error("Research request timed out")),
      8000,
    );
    request.on("close", () => clearTimeout(timer));
    request.on("error", reject);
    request.end();
  });
}
