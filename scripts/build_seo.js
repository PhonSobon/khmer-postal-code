/**
 * Generate search-engine-friendly static pages from data.js.
 *
 * Search engines index plain HTML far more reliably than content rendered by
 * app.js in the browser, so this writes one real HTML page per province,
 * district and commune, plus sitemap.xml, robots.txt, and meta tags / JSON-LD
 * on index.html.
 *
 * Usage:
 *   node scripts/build_seo.js
 *   SITE_URL=https://postcode.example.gov.kh node scripts/build_seo.js
 *
 * Set "siteUrl" in site.config.json (or the SITE_URL env var) to the public
 * address the site will be hosted at; sitemap.xml and canonical links need it.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "places");
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
const SITE_URL = (process.env.SITE_URL || config.siteUrl).replace(/\/+$/, "");
const SITE_NAME = config.siteName;
const SITE_NAME_KH = config.siteNameKh;
const TODAY = new Date().toISOString().slice(0, 10);

if (/example\.com/.test(SITE_URL)) {
  console.warn("WARNING: siteUrl is still the placeholder. Set it in site.config.json before deploying.");
}

// ---------- Load data ----------
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "data.js"), "utf8"), sandbox);
const DATA = sandbox.window.POSTAL_DATA;
const byCode = new Map(DATA.map((e) => [e.code, e]));

const TYPES = {
  province: { kh: "ខេត្ត", en: "Province" },
  capital: { kh: "រាជធានី", en: "Capital" },
  district: { kh: "ស្រុក", en: "District" },
  municipality: { kh: "ក្រុង", en: "Municipality" },
  khan: { kh: "ខណ្ឌ", en: "Khan" },
  commune: { kh: "ឃុំ", en: "Commune" },
  sangkat: { kh: "សង្កាត់", en: "Sangkat" },
};

// ---------- Helpers ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function slug(text) {
  return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const pageDir = (e) => `places/${e.code}-${slug(e.en)}/`;
const pageUrl = (e) => `${SITE_URL}/${pageDir(e)}`;

function parentsOf(e) {
  const chain = [];
  if (e.level !== "province") chain.push(byCode.get(e.p));
  if (e.level === "commune") chain.push(byCode.get(e.d));
  return chain; // top-down: province, district
}

function childrenOf(e) {
  if (e.level === "province") return DATA.filter((x) => x.level === "district" && x.p === e.code);
  if (e.level === "district") return DATA.filter((x) => x.level === "commune" && x.d === e.code);
  return [];
}

const fullKh = (e) => `${TYPES[e.type].kh}${e.kh}`;
function fullEn(e) {
  const t = TYPES[e.type].en;
  if (e.type === "sangkat" || e.type === "khan") return `${t} ${e.en}`;
  if (e.type === "capital") return e.en;
  return `${e.en} ${t}`;
}

function addressKh(e) {
  return [e, ...parentsOf(e).reverse()].map(fullKh).join(" ") + ` ${e.code} ព្រះរាជាណាចក្រកម្ពុជា`;
}
function addressEn(e) {
  return [e, ...parentsOf(e).reverse()].map(fullEn).join(", ") + ` ${e.code}, Cambodia`;
}

// ---------- Structured data ----------
function jsonLd(e) {
  const parents = parentsOf(e);
  const province = e.level === "province" ? e : parents[0];
  const place = {
    "@type": "Place",
    "@id": pageUrl(e) + "#place",
    name: `${fullEn(e)} (${fullKh(e)})`,
    alternateName: [e.en, e.kh, fullKh(e)],
    url: pageUrl(e),
    address: {
      "@type": "PostalAddress",
      postalCode: e.code,
      addressCountry: "KH",
      addressRegion: province.en,
      ...(e.level !== "province" ? { addressLocality: e.level === "commune" ? parents[1].en : e.en } : {}),
    },
  };
  if (e.level !== "province") place.containedInPlace = { "@id": pageUrl(parents[parents.length - 1]) + "#place" };

  const crumbs = [{ name: SITE_NAME, url: `${SITE_URL}/` }, ...parents.map((p) => ({ name: fullEn(p), url: pageUrl(p) })), { name: fullEn(e), url: pageUrl(e) }];
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
  };
  return JSON.stringify({ "@context": "https://schema.org", "@graph": [place, breadcrumb] }).replace(/</g, "\\u003c");
}

// ---------- Page template ----------
function codeSpans(e) {
  const [p, d, c] = [e.code.slice(0, 2), e.code.slice(2, 4), e.code.slice(4)];
  return `<span class="seg-p">${p}</span><span class="${e.level === "province" ? "muted" : "seg-d"}">${d}</span><span class="${e.level === "commune" ? "seg-c" : "muted"}">${c}</span>`;
}

function placeTable(list, rel, caption) {
  if (!list.length) return "";
  const rows = list.map((x) => `
        <tr>
          <td><a class="code" href="${rel}${pageDir(x)}">${esc(x.code)}</a></td>
          <td><a href="${rel}${pageDir(x)}"><span class="name-kh">${esc(fullKh(x))}</span></a><div class="name-en" lang="en">${esc(fullEn(x))}</div></td>
        </tr>`).join("");
  return `
    <section class="place-section">
      <h2>${caption}</h2>
      <div class="table-wrap">
        <table class="results static">
          <thead><tr><th scope="col">លេខកូដ <span lang="en">Code</span></th><th scope="col">ឈ្មោះ <span lang="en">Name</span></th></tr></thead>
          <tbody>${rows}
          </tbody>
        </table>
      </div>
    </section>`;
}

function renderPage(e) {
  const rel = "../../";
  const parents = parentsOf(e);
  const children = childrenOf(e);
  const where = parents.length ? parents.slice().reverse().map(fullEn).join(", ") + ", " : "";
  const whereKh = parents.length ? " " + parents.slice().reverse().map(fullKh).join(" ") : "";

  const title = `${fullEn(e)} postal code ${e.code} · ${fullKh(e)}`;
  let description = `The postal code of ${fullEn(e)}, ${where}Cambodia is ${e.code}. លេខកូដប្រៃសណីយ៍ ${fullKh(e)}${whereKh} គឺ ${e.code}។`;
  if (children.length) description += ` Lists all ${children.length} ${e.level === "province" ? "districts" : "communes"}.`;

  const crumbs = [`<a href="${rel}index.html">${esc(SITE_NAME_KH)}</a>`, ...parents.map((p) => `<a href="${rel}${pageDir(p)}">${esc(fullKh(p))}</a>`), `<span aria-current="page">${esc(fullKh(e))}</span>`];

  let childSection = "";
  if (e.level === "province") childSection = placeTable(children, rel, `ស្រុក ក្រុង ខណ្ឌ ក្នុង${esc(fullKh(e))} <span lang="en">· Districts in ${esc(fullEn(e))}</span>`);
  if (e.level === "district") childSection = placeTable(children, rel, `ឃុំ សង្កាត់ ក្នុង${esc(fullKh(e))} <span lang="en">· Communes in ${esc(fullEn(e))}</span>`);
  if (e.level === "commune") {
    const siblings = childrenOf(byCode.get(e.d)).filter((x) => x.code !== e.code);
    childSection = placeTable(siblings, rel, `ឃុំ សង្កាត់ ផ្សេងទៀតក្នុង${esc(fullKh(byCode.get(e.d)))} <span lang="en">· Other communes in ${esc(fullEn(byCode.get(e.d)))}</span>`);
  }

  return `<!doctype html>
<html lang="km">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${pageUrl(e)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE_NAME)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${pageUrl(e)}">
<meta property="og:locale" content="km_KH">
<meta property="og:locale:alternate" content="en_US">
<meta name="twitter:card" content="summary">
<script type="application/ld+json">${jsonLd(e)}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;500;600;700&family=Moul&family=IBM+Plex+Mono:wght@500;600&display=swap">
<link rel="stylesheet" href="${rel}styles.css">
</head>
<body>
<div class="wrap page">
  <nav class="crumbs-nav" aria-label="Breadcrumb">${crumbs.join('<span aria-hidden="true">›</span>')}</nav>

  <header class="place-head">
    <span class="badge badge-${e.level}">${esc(TYPES[e.type].kh)} <span lang="en">${esc(TYPES[e.type].en)}</span></span>
    <h1>${esc(fullKh(e))}</h1>
    <p class="sub" lang="en">${esc(fullEn(e))}</p>
    <p class="place-code" aria-label="Postal code ${e.code}">${codeSpans(e)}</p>
  </header>

  <section class="place-facts">
    <dl>
      <div><dt>លេខកូដប្រៃសណីយ៍ <span lang="en">Postal code</span></dt><dd class="code">${e.code}</dd></div>
      ${parents.map((p) => `<div><dt>${esc(TYPES[p.type].kh)} <span lang="en">${esc(TYPES[p.type].en)}</span></dt><dd><a href="${rel}${pageDir(p)}">${esc(fullKh(p))}</a> <span class="muted" lang="en">${esc(fullEn(p))}</span> · <span class="code">${p.code}</span></dd></div>`).join("\n      ")}
      <div><dt>អាសយដ្ឋាន <span lang="en">Address line</span></dt><dd class="stack"><div class="address">${esc(addressKh(e))}</div><div class="address" lang="en">${esc(addressEn(e))}</div></dd></div>
    </dl>
    <p><a class="btn" href="${rel}index.html#${e.code}">ស្វែងរកក្នុងកម្មវិធី <span lang="en">· Open in search</span></a></p>
  </section>
${childSection}
  <footer class="foot"><p><a href="${rel}index.html">${esc(SITE_NAME_KH)}</a> · <span lang="en">${esc(SITE_NAME)}</span></p></footer>
</div>
</body>
</html>
`;
}

// ---------- Home page: meta tags ----------
function replaceBetween(html, name, content) {
  const re = new RegExp(`(<!-- SEO:${name}:START -->)[\\s\\S]*?(<!-- SEO:${name}:END -->)`);
  if (!re.test(html)) throw new Error(`Marker SEO:${name} not found in index.html`);
  return html.replace(re, `$1\n${content}\n$2`);
}

function updateHome() {
  const file = path.join(ROOT, "index.html");
  let html = fs.readFileSync(file, "utf8");
  const provinces = DATA.filter((e) => e.level === "province");
  const counts = { p: provinces.length, d: DATA.filter((e) => e.level === "district").length, c: DATA.filter((e) => e.level === "commune").length };
  const description = `Find the postal code of every province, district and commune in Cambodia: ${counts.p} provinces, ${counts.d} districts, ${counts.c} communes. ស្វែងរកលេខកូដប្រៃសណីយ៍ ខេត្ត ស្រុក ឃុំ ទូទាំងប្រទេសកម្ពុជា។`;

  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: SITE_NAME_KH,
    url: `${SITE_URL}/`,
    inLanguage: ["km", "en"],
    potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/?q={search_term_string}`, "query-input": "required name=search_term_string" },
  });

  html = replaceBetween(html, "HEAD", `<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE_URL}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE_NAME)}">
<meta property="og:title" content="${esc(SITE_NAME)} · ${esc(SITE_NAME_KH)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE_URL}/">
<meta property="og:locale" content="km_KH">
<meta property="og:locale:alternate" content="en_US">
<meta name="twitter:card" content="summary">
<script type="application/ld+json">${ld}</script>`);

  fs.writeFileSync(file, html);
}

// ---------- Write everything ----------
fs.rmSync(OUT_DIR, { recursive: true, force: true });
for (const e of DATA) {
  const dir = path.join(ROOT, pageDir(e));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), renderPage(e));
}

const urls = [`${SITE_URL}/`, ...DATA.map(pageUrl)];
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(u)}</loc><lastmod>${TODAY}</lastmod></url>`).join("\n")}
</urlset>
`);
fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

updateHome();
console.log(`Wrote ${DATA.length} pages to places/, sitemap.xml (${urls.length} URLs), robots.txt, and updated index.html for ${SITE_URL}`);
