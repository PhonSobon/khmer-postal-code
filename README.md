# Cambodia Postal Codes · លេខកូដប្រៃសណីយ៍កម្ពុជា

Search and filter the postal code of every province, district and commune in Cambodia, in Khmer or English.

ស្វែងរកលេខកូដប្រៃសណីយ៍ ខេត្ត ស្រុក ឃុំ ទូទាំងប្រទេសកម្ពុជា ជាភាសាខ្មែរ ឬអង់គ្លេស។

**Live site:** https://phonsobon.github.io/khmer-postal-code/

| Level | Count |
| --- | ---: |
| Provinces / Capital · ខេត្ត / រាជធានី | 25 |
| Districts / Municipalities / Khans · ស្រុក / ក្រុង / ខណ្ឌ | 210 |
| Communes / Sangkats · ឃុំ / សង្កាត់ | 1,652 |

## Features

- **Search** by Khmer name, English name or code. Several words work together (`Tuol Kouk`, `កំពត`), and a partial code such as `1204` lists everything under it.
- **Common spellings match**: Phnom/Phnum, Koh/Kaoh, Stung/Stueng, Prek/Preaek, Toul/Tuol, Russey/Ruessei.
- **Filter** by province, then district, and by level (province, district, commune).
- **Browse step by step**: choose the ខេត្ត (province) level, click a province to see its districts, then click a district to see its communes. A breadcrumb above the table takes you back up.
- **Details panel** with the full hierarchy and a ready-made address line in Khmer and English, plus copy buttons.
- **Export** the current results as CSV (copy or download; opens correctly in Excel with Khmer text).
- **Khmer / English** interface, light and dark themes, works on phones.
- **Deep links**: `index.html#120400` opens Khan Tuol Kouk; `index.html?q=Kampot` pre-fills the search.
- **SEO pages**: one static HTML page per place under `places/`, with `sitemap.xml`, `robots.txt`, meta tags and schema.org structured data.

## How a postal code is built

Codes have six digits, `PPDDCC`:

| Digits | Meaning | Example `070201` |
| --- | --- | --- |
| `PP` | Province | `07` Kampot |
| `DD` | District | `02` Banteay Meas |
| `CC` | Commune | `01` Banteay Meas Khang Kaeut |

A district code ends in `00` (`070200`) and a province code ends in `0000` (`070000`).

## Run it locally

No install or server is needed. Open `index.html` in a browser.

## Project structure

```
index.html              Search app page
app.js                  Search, filters, details panel, CSV export
styles.css              Styles for the app and the generated pages
data.js                 Generated data used by the app (do not edit)
data/CambodiaPostalCode.csv   Source data
scripts/build_data.py   CSV -> data.js
scripts/build_seo.js    data.js -> places/, sitemap.xml, robots.txt, index.html meta tags
site.config.json        Public site URL and site name used for SEO
places/                 Generated page for every province, district and commune
```

## Updating the data

1. Replace `data/CambodiaPostalCode.csv` (same columns).
2. Rebuild the app data:
   ```
   python scripts/build_data.py
   ```
3. Rebuild the SEO pages:
   ```
   node scripts/build_seo.js
   ```
4. Commit and push.

Requires Python 3 and Node.js 18 or newer. Neither script needs extra packages.

### Data cleaning

The source CSV has some rows in the wrong columns. For example, Stung Treng communes are listed under Sihanoukville, and several districts (Kampong Leaeng, Pou Rieng, Veun Sai, Varin, Kep city) appear in the commune column. `build_data.py` ignores the column a row appears in and rebuilds the hierarchy from the `PPDDCC` code itself. It also strips the type prefix from names (ខេត្ត, ស្រុក, ឃុំ, Sangkat, Khan…) into a separate type field, and fixes a few English spelling errors listed in `EN_FIXES`.

## Deploying

The site is plain static files, so any static host works.

**GitHub Pages:** in the repository, open **Settings → Pages**, set **Source** to **Deploy from a branch**, choose `main` and `/ (root)`, and save.

**Custom domain:** set `siteUrl` in `site.config.json` to the new address, run `node scripts/build_seo.js`, and push. You can also pass it once with `SITE_URL=https://your-domain node scripts/build_seo.js`.

After deploying, add the site in [Google Search Console](https://search.google.com/search-console) and submit `sitemap.xml`.
