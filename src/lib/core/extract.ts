import { load } from "cheerio";
import { normalizeName } from "./normalize";
export function extractPage(html: string, businessName: string) {
  const $ = load(html);
  $("script,style,noscript,iframe").remove();
  const title = $("title").text();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const brand = normalizeName(businessName);
  const identity =
    brand.length >= 4 &&
    normalizeName(title + " " + $("h1").text()).includes(brand);
  const parked =
    /domain (is )?(for sale|parked)|buy this domain|sedo parking|this domain may be for sale|hugedomains|default web site page|welcome to nginx|index of \/|site under construction|account suspended|website coming soon/i.test(
      title + " " + text,
    );
  const blocked =
    /captcha|verify (that )?you are human|access denied|enable javascript|checking your browser/i.test(
      title + " " + text,
    );
  const candidates = new Set<string>();
  $("a[href^='mailto:']").each((_, a) => {
    const v = $(a).attr("href")?.slice(7).split("?")[0];
    if (v) {
      try {
        candidates.add(decodeURIComponent(v));
      } catch {
        /* invalid encoding is not an email */
      }
    }
  });
  for (const email of text.match(
    /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
  ) ?? [])
    candidates.add(email);
  const emails = [...candidates]
    .map((e) => e.trim().toLowerCase())
    .filter(
      (e) =>
        /^[^\s@,;]+@[^\s@,;]+\.[a-z]{2,}$/i.test(e) &&
        !/\.(png|jpg|jpeg|svg|webp)$/i.test(e) &&
        !/@(example\.(com|org)|sentry\.io)$/.test(e),
    )
    .slice(0, 5);
  const links = $("a[href]")
    .toArray()
    .map((a) => $(a).attr("href")!)
    .filter((v) => /contact|about|team/i.test(v))
    .slice(0, 3);
  const dates = $("time[datetime]")
    .toArray()
    .map((t) => $(t).attr("datetime")!)
    .filter((d) => Number.isFinite(Date.parse(d)));
  return {
    title,
    text,
    identity,
    parked,
    blocked,
    emails,
    links,
    dates,
    functional:
      identity &&
      !parked &&
      !blocked &&
      text.length >= 150 &&
      $("a[href]").length > 0,
  };
}
