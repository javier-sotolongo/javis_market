import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadRemoteImage, isBlockedAddress, validateImageUrl } from "./remote-image";

describe("isBlockedAddress", () => {
  it("blocks private, loopback, link-local and metadata addresses", () => {
    for (const address of [
      "127.0.0.1",
      "10.1.2.3",
      "172.20.0.1",
      "192.168.1.10",
      "169.254.169.254",
      "0.0.0.0",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
    ]) {
      expect(isBlockedAddress(address), address).toBe(true);
    }
  });

  it("allows public addresses", () => {
    expect(isBlockedAddress("93.184.215.14")).toBe(false);
    expect(isBlockedAddress("2606:2800:21f:cb07:6820:80da:af6b:8b2c")).toBe(false);
  });
});

describe("validateImageUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("rejects non-web schemes, credentials, custom ports and internal hosts", () => {
    for (const url of [
      "file:///etc/passwd",
      "ftp://example.com/a.jpg",
      "https://user:pass@example.com/a.jpg",
      "https://example.com:8080/a.jpg",
      "http://localhost/a.jpg",
      "http://127.0.0.1/a.jpg",
      "http://[::1]/a.jpg",
      "not a url",
    ]) {
      expect(() => validateImageUrl(url), url).toThrow();
    }
  });

  it("accepts public https URLs", () => {
    expect(validateImageUrl("https://cdn.example.com/img/a.jpg").hostname).toBe("cdn.example.com");
  });

  it("enforces the optional host allow-list", () => {
    vi.stubEnv("IMAGE_IMPORT_ALLOWED_HOSTS", "*.deliflow.example, images.example.com");
    expect(() => validateImageUrl("https://cdn.deliflow.example/a.jpg")).not.toThrow();
    expect(() => validateImageUrl("https://images.example.com/a.jpg")).not.toThrow();
    expect(() => validateImageUrl("https://other.example.com/a.jpg")).toThrow();
  });
});

describe("downloadRemoteImage", () => {
  it("refuses hosts that resolve to internal addresses", async () => {
    // localtest.me y similares resuelven a 127.0.0.1; usamos una IP literal para no depender de la red.
    await expect(downloadRemoteImage("http://127.0.0.1/image.png")).rejects.toThrow("not allowed");
  });
});
