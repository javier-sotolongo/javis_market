import { lookup as dnsLookup } from "node:dns";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { optionalEnv } from "../../config/env";
import { DomainError } from "../../infrastructure/errors";
import { MAX_IMAGE_BYTES } from "./image-processing";

const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;

/** Rangos que nunca se pueden consultar desde el servidor (red local, loopback, metadatos de nube, etc.). */
const blocked = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(network, prefix, "ipv6");
}

export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return blocked.check(address, "ipv4");
  if (family === 6) {
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
    if (mapped?.[1]) return blocked.check(mapped[1], "ipv4");
    return blocked.check(address, "ipv6");
  }
  return true;
}

function allowedHosts(): string[] | null {
  const value = optionalEnv("IMAGE_IMPORT_ALLOWED_HOSTS");
  return value
    ? value
        .split(",")
        .map((host) => host.trim().toLowerCase())
        .filter(Boolean)
    : null;
}

function hostMatches(hostname: string, pattern: string): boolean {
  return pattern.startsWith("*.") ? hostname.endsWith(pattern.slice(1)) : hostname === pattern;
}

/** Valida la forma de la URL antes de cualquier conexión. */
export function validateImageUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new DomainError("validation_failed", "Enter a valid image URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new DomainError("validation_failed", "Only http and https image URLs are allowed.");
  }
  if (url.username || url.password) {
    throw new DomainError("validation_failed", "Image URLs cannot contain credentials.");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new DomainError("validation_failed", "Image URLs must use the standard web ports.");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (isIP(hostname) && isBlockedAddress(hostname)) {
    throw new DomainError("validation_failed", "This address is not allowed.");
  }
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new DomainError("validation_failed", "This address is not allowed.");
  }
  const allowList = allowedHosts();
  if (allowList && !allowList.some((pattern) => hostMatches(hostname, pattern))) {
    throw new DomainError("validation_failed", "Images can only be imported from the configured storage hosts.");
  }
  return url;
}

/** Resolución DNS que rechaza direcciones internas en el momento de conectar (evita DNS rebinding). */
const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, "", 0);
    const list = addresses as unknown as { address: string; family: number }[];
    const first = list[0];
    if (!first || list.some((entry) => isBlockedAddress(entry.address))) {
      return callback(Object.assign(new Error("Blocked address"), { code: "EBLOCKED" }), "", 0);
    }
    if (options.all) {
      (callback as unknown as (err: null, addresses: typeof list) => void)(null, list);
    } else {
      callback(null, first.address, first.family);
    }
  });
};

interface FetchResult {
  readonly status: number;
  readonly location: string | undefined;
  readonly body: Uint8Array;
}

function request(url: URL): Promise<FetchResult> {
  const client = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.get(
      url,
      {
        lookup: guardedLookup,
        timeout: TIMEOUT_MS,
        headers: { Accept: "image/*", "User-Agent": "JavisMarket-ImageImport/1.0" },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, location: res.headers.location, body: new Uint8Array() });
        }
        const declared = Number(res.headers["content-length"] ?? 0);
        if (declared > MAX_IMAGE_BYTES) {
          res.destroy();
          return reject(new DomainError("payload_too_large", "The remote image is too large."));
        }
        const chunks: Buffer[] = [];
        let total = 0;
        res.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > MAX_IMAGE_BYTES) {
            res.destroy();
            reject(new DomainError("payload_too_large", "The remote image is too large."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => resolve({ status, location: undefined, body: new Uint8Array(Buffer.concat(chunks)) }));
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new DomainError("validation_failed", "The image download timed out.")));
    req.on("error", reject);
  });
}

/**
 * Descarga una imagen desde otro almacenamiento para guardarla en el VPS.
 * Solo direcciones públicas, puertos web estándar, hasta 3 redirecciones (cada una revalidada) y tamaño limitado.
 */
export async function downloadRemoteImage(
  rawUrl: string,
): Promise<{ readonly url: string; readonly body: Uint8Array }> {
  let url = validateImageUrl(rawUrl);
  for (let redirects = 0; ; redirects++) {
    let result: FetchResult;
    try {
      result = await request(url);
    } catch (error) {
      if (error instanceof DomainError) throw error;
      const blockedAddress = (error as NodeJS.ErrnoException).code === "EBLOCKED";
      throw new DomainError(
        "validation_failed",
        blockedAddress ? "This address is not allowed." : "The image could not be downloaded.",
      );
    }
    if (result.status >= 300 && result.status < 400 && result.location) {
      if (redirects >= MAX_REDIRECTS) {
        throw new DomainError("validation_failed", "The image URL redirects too many times.");
      }
      url = validateImageUrl(new URL(result.location, url).toString());
      continue;
    }
    if (result.status !== 200) {
      throw new DomainError("validation_failed", `The image could not be downloaded (HTTP ${result.status}).`);
    }
    return { url: url.toString(), body: result.body };
  }
}
