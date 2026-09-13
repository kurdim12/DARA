import { describe, expect, it } from "vitest";
import { extractUrls, governmentImpersonationSignal, inspectText, inspectUrl, isJordanGovernmentHost, registrableName } from "../worker/engine/url";

describe("extractUrls", () => {
  it("finds a link in an Arabic sentence without swallowing the comma", () => {
    const urls = extractUrls("ادفع عبر https://jo-traffic-fines.net، خلال 24 ساعة");
    expect(urls).toContain("https://jo-traffic-fines.net");
  });

  it("finds a bare hostname with no scheme", () => {
    expect(extractUrls("زر موقع arabbank-secure.verify-now.com اليوم")).toContain(
      "arabbank-secure.verify-now.com",
    );
  });

  it("returns nothing for a message with no link", () => {
    expect(extractUrls("وصلت البيت؟ طمنّي لما توصل.")).toHaveLength(0);
  });
});

describe("inspectUrl", () => {
  it("parses hostname and scheme", () => {
    const f = inspectUrl("https://example.com.jo/path")!;
    expect(f.hostname).toBe("example.com.jo");
    expect(f.https).toBe(true);
    expect(f.signals).not.toContain("not_https");
  });

  it("flags plain http when the user wrote the scheme", () => {
    expect(inspectUrl("http://pay-now.example/x")!.signals).toContain("not_https");
  });

  it("flags an IP address used as a hostname", () => {
    expect(inspectUrl("http://192.168.10.44/login")!.signals).toContain("ip_hostname");
  });

  it("flags a punycode look-alike hostname", () => {
    expect(inspectUrl("https://xn--80ak6aa92e.com")!.signals).toContain("punycode_hostname");
  });

  it("flags excessive subdomains", () => {
    const f = inspectUrl("https://a.b.c.d.example.com")!;
    expect(f.signals).toContain("many_subdomains");
  });

  it("flags suspicious words in the hostname", () => {
    expect(inspectUrl("https://arabbank-secure.verify-now.com")!.signals).toContain(
      "suspicious_words",
    );
  });

  it("leaves an ordinary hostname with no signals at all", () => {
    const f = inspectUrl("https://www.example.com/article")!;
    expect(f.signals).toHaveLength(0);
  });

  it("refuses anything that is not http or https", () => {
    expect(inspectUrl("javascript:alert(1)")).toBeNull();
    expect(inspectUrl("data:text/html,<script>")).toBeNull();
  });
});

describe("registrableName", () => {
  it("keeps three labels for a two-letter country suffix", () => {
    expect(registrableName("portal.gov.jo")).toBe("portal.gov.jo");
    expect(registrableName("shop.company.com.jo")).toBe("company.com.jo");
  });

  it("keeps two labels otherwise", () => {
    expect(registrableName("mail.example.com")).toBe("example.com");
  });
});

describe("Jordan government rule", () => {
  it("recognises .gov.jo", () => {
    expect(isJordanGovernmentHost("mit.gov.jo")).toBe(true);
    expect(isJordanGovernmentHost("gov.jo")).toBe(true);
  });

  it("does not treat other Jordanian domains as government", () => {
    expect(isJordanGovernmentHost("arabbank.com.jo")).toBe(false);
    expect(isJordanGovernmentHost("ju.edu.jo")).toBe(false);
  });

  it("flags a government claim that links somewhere other than .gov.jo", () => {
    const facts = inspectUrl("https://mof-jo.verify-now.com/pay")!;
    expect(governmentImpersonationSignal(facts, "impersonation_government")).toBe(
      "claimed_government_non_gov_jo",
    );
  });

  it("does not flag a government claim that links to .gov.jo", () => {
    const facts = inspectUrl("https://services.gov.jo/pay")!;
    expect(governmentImpersonationSignal(facts, "impersonation_government")).toBeNull();
  });

  it("does not flag a bank on its own non-government domain", () => {
    const facts = inspectUrl("https://arabbank.com.jo/login")!;
    expect(governmentImpersonationSignal(facts, "impersonation_bank")).toBeNull();
  });
});

describe("inspectText", () => {
  it("picks the link carrying the most signals", () => {
    const text =
      "زر https://example.com ثم https://secure-verify-login.a.b.c.example.net للتحديث";
    const facts = inspectText(text)!;
    expect(facts.hostname).toBe("secure-verify-login.a.b.c.example.net");
    expect(facts.signals.length).toBeGreaterThan(0);
  });

  it("handles a URL-only input", () => {
    const facts = inspectText("http://arabbank-secure.verify-now.com")!;
    expect(facts.hostname).toBe("arabbank-secure.verify-now.com");
    expect(facts.signals).toContain("suspicious_words");
  });

  it("returns null when there is no link", () => {
    expect(inspectText("رمز التحقق الخاص بك هو 482913.")).toBeNull();
  });
});

/**
 * The demo's headline family. Until the real SMS text arrives, the golden set
 * carries a reconstruction (AUDIT.md, A3) and the eval asserts the government
 * signal on it, so the deterministic half of that assertion is pinned here.
 */
describe("the parking-fine family", () => {
  const link = "http://amanat-amman-pay.com/fine";

  it("does not link to a Jordanian government host", () => {
    const facts = inspectText(link)!;
    expect(isJordanGovernmentHost(facts.hostname)).toBe(false);
  });

  it("raises the government signal once the engine calls it government impersonation", () => {
    const facts = inspectText(link)!;
    expect(governmentImpersonationSignal(facts, "impersonation_government")).toBe(
      "claimed_government_non_gov_jo",
    );
  });

  it("stays quiet when the message is not claiming to be the government", () => {
    const facts = inspectText(link)!;
    expect(governmentImpersonationSignal(facts, "phishing_link")).toBeNull();
  });
});
