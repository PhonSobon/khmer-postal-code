(function () {
  "use strict";

  const PAGE_SIZE = 50;
  const DATA = window.POSTAL_DATA || [];
  const byCode = new Map(DATA.map((e) => [e.code, e]));
  const childCount = new Map();
  for (const e of DATA) {
    if (e.level === "district") childCount.set(e.p, (childCount.get(e.p) || 0) + 1);
    if (e.level === "commune") childCount.set(e.d, (childCount.get(e.d) || 0) + 1);
  }

  // ---------- i18n ----------
  const I18N = {
    km: {
      title: "លេខកូដប្រៃសណីយ៍កម្ពុជា",
      subtitle: "ស្វែងរកលេខកូដតាម ខេត្ត ស្រុក និង ឃុំ",
      howToRead: "របៀបអានលេខកូដ",
      keyP: "ខេត្ត / រាជធានី",
      keyD: "ស្រុក / ក្រុង / ខណ្ឌ",
      keyC: "ឃុំ / សង្កាត់",
      provinces: "ខេត្ត",
      districts: "ស្រុក",
      communes: "ឃុំ",
      search: "ស្វែងរក",
      searchPh: "ឈ្មោះ ឬលេខកូដ ឧ. កំពត, Tuol Kouk, 1204",
      province: "ខេត្ត / រាជធានី",
      district: "ស្រុក / ក្រុង / ខណ្ឌ",
      level: "កម្រិត",
      all: "ទាំងអស់",
      allProvinces: "ខេត្ត / រាជធានី ទាំងអស់",
      allDistricts: "ស្រុក / ក្រុង / ខណ្ឌ ទាំងអស់",
      pickProvinceFirst: "ជ្រើសរើសខេត្តជាមុនសិន",
      reset: "សម្អាត",
      copyCsv: "ចម្លងជា CSV",
      downloadCsv: "ទាញយក CSV",
      code: "លេខកូដ",
      name: "ឈ្មោះ",
      type: "ប្រភេទ",
      noResults: "រកមិនឃើញលទ្ធផល",
      noResultsHint: "សាកល្បងពាក្យផ្សេង ឬសម្អាតតម្រង។",
      source: "ប្រភពទិន្នន័យ៖ CambodiaPostalCode.csv",
      count: (n, from, to) => n === 0 ? "គ្មានលទ្ធផល" : `បង្ហាញ <strong>${from}–${to}</strong> នៃ <strong>${n}</strong> លទ្ធផល`,
      copyCode: "ចម្លងលេខកូដ",
      copyAddress: "ចម្លងអាសយដ្ឋាន",
      address: "អាសយដ្ឋាន",
      showChildren: (n, what) => `បង្ហាញ ${what} ${n}`,
      childDistricts: "ស្រុក/ក្រុង/ខណ្ឌ",
      childCommunes: "ឃុំ/សង្កាត់",
      pickRow: "ចុចលើខេត្ត ដើម្បីមើលស្រុក ចុចលើស្រុក ដើម្បីមើលឃុំ ហើយចុចលើឃុំ ដើម្បីមើលព័ត៌មានលម្អិត។",
      open: "បើក",
      copied: "បានចម្លង",
      copiedRows: (n) => `បានចម្លង ${n} ជួរ`,
      copyFailed: "មិនអាចចម្លងបាន។ សូមជ្រើសអត្ថបទ ហើយចម្លងដោយដៃ។",
      close: "បិទ",
      cambodia: "ព្រះរាជាណាចក្រកម្ពុជា",
      types: { province: "ខេត្ត", capital: "រាជធានី", district: "ស្រុក", municipality: "ក្រុង", khan: "ខណ្ឌ", commune: "ឃុំ", sangkat: "សង្កាត់" },
    },
    en: {
      title: "Cambodia Postal Codes",
      subtitle: "Find the postal code for any province, district or commune",
      howToRead: "How a code is built",
      keyP: "Province / Capital",
      keyD: "District / Municipality / Khan",
      keyC: "Commune / Sangkat",
      provinces: "Provinces",
      districts: "Districts",
      communes: "Communes",
      search: "Search",
      searchPh: "Name or code, e.g. Kampot, ទួលគោក, 1204",
      province: "Province / Capital",
      district: "District / Municipality / Khan",
      level: "Level",
      all: "All",
      allProvinces: "All provinces",
      allDistricts: "All districts",
      pickProvinceFirst: "Choose a province first",
      reset: "Clear filters",
      copyCsv: "Copy as CSV",
      downloadCsv: "Download CSV",
      code: "Code",
      name: "Name",
      type: "Type",
      noResults: "No matching places",
      noResultsHint: "Try another spelling or clear the filters.",
      source: "Data source: CambodiaPostalCode.csv",
      count: (n, from, to) => n === 0 ? "No results" : `Showing <strong>${from}–${to}</strong> of <strong>${n}</strong>`,
      copyCode: "Copy code",
      copyAddress: "Copy address",
      address: "Address line",
      showChildren: (n, what) => `Show ${n} ${what}`,
      childDistricts: "districts",
      childCommunes: "communes",
      pickRow: "Click a province to see its districts, a district to see its communes, and a commune to see its details.",
      open: "Open",
      copied: "Copied",
      copiedRows: (n) => `Copied ${n} rows`,
      copyFailed: "Copy was blocked. Select the text and copy it manually.",
      close: "Close",
      cambodia: "Cambodia",
      types: { province: "Province", capital: "Capital", district: "District", municipality: "Municipality", khan: "Khan", commune: "Commune", sangkat: "Sangkat" },
    },
  };

  let lang = "km";
  try { lang = localStorage.getItem("kpc.lang") || "km"; } catch (e) { /* storage unavailable */ }
  if (!I18N[lang]) lang = "km";
  const t = (key) => I18N[lang][key];

  // ---------- Search index ----------
  const ALIASES = [
    [/phnom/g, "phnum"], [/kaoh/g, "koh"], [/toul/g, "tuol"], [/stueng/g, "stung"],
    [/preaek/g, "prek"], [/ruessei|russey|russei|reussei/g, "russei"], [/tbong/g, "tboung"],
  ];
  function norm(s) {
    let out = (s || "").normalize("NFC").toLowerCase();
    for (const [re, rep] of ALIASES) out = out.replace(re, rep);
    return out.replace(/[\s'’"\-.,()​‌‍]/g, "");
  }

  for (const e of DATA) {
    const p = byCode.get(e.p);
    const d = e.d && e.d !== e.code ? byCode.get(e.d) : null;
    e.own = norm(e.kh) + "|" + norm(e.en);
    e.hay = e.own + "|" + (d ? norm(d.kh) + "|" + norm(d.en) : "") + "|" + (p && p !== e ? norm(p.kh) + "|" + norm(p.en) : "");
  }

  // ---------- State ----------
  const state = { q: "", province: "", district: "", level: "all", sort: null, dir: "asc", page: 1, selected: null };
  let results = [];

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const els = {
    q: $("q"), province: $("f-province"), district: $("f-district"),
    rows: $("rows"), empty: $("empty"), pager: $("pager"), count: $("count"),
    detail: $("detail"), detailBody: $("detail-body"), toast: $("toast"), path: $("path"),
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function highlight(text, tokens) {
    let html = esc(text);
    const words = tokens.filter((tk) => tk.length > 1 && !/^\d+$/.test(tk));
    if (!words.length) return html;
    const re = new RegExp("(" + words.map((w) => esc(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
    return html.replace(re, "<mark>$1</mark>");
  }

  function codeHtml(code, level) {
    const p = code.slice(0, 2), d = code.slice(2, 4), c = code.slice(4);
    if (level === "province") return `<span class="p">${p}</span><span class="z">${d}${c}</span>`;
    if (level === "district") return `<span class="p">${p}</span><span class="d">${d}</span><span class="z">${c}</span>`;
    return `<span class="p">${p}</span><span class="d">${d}</span><span class="c">${c}</span>`;
  }

  const typeLabel = (e) => t("types")[e.type];
  const name = (e) => (lang === "km" ? e.kh : e.en);
  const levelBadge = (e) => `<span class="badge badge-${e.level}">${esc(typeLabel(e))}</span>`;

  // ---------- Static text ----------
  function applyLang() {
    document.documentElement.lang = lang;
    document.title = I18N.en.title + (lang === "km" ? " · " + I18N.km.title : "");
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const v = t(el.dataset.i18n);
      if (typeof v === "string") el.textContent = v;
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    document.querySelectorAll(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    fillProvinces();
    fillDistricts();
  }

  function fillProvinces() {
    const provs = DATA.filter((e) => e.level === "province");
    els.province.innerHTML = `<option value="">${esc(t("allProvinces"))}</option>` +
      provs.map((p) => `<option value="${p.code}">${esc(name(p))} · ${p.code.slice(0, 2)}</option>`).join("");
    els.province.value = state.province;
  }

  function fillDistricts() {
    if (!state.province) {
      els.district.innerHTML = `<option value="">${esc(t("pickProvinceFirst"))}</option>`;
      els.district.disabled = true;
      return;
    }
    const ds = DATA.filter((e) => e.level === "district" && e.p === state.province);
    els.district.innerHTML = `<option value="">${esc(t("allDistricts"))}</option>` +
      ds.map((d) => `<option value="${d.code}">${esc(typeLabel(d))} ${esc(name(d))} · ${d.code.slice(0, 4)}</option>`).join("");
    els.district.disabled = false;
    els.district.value = state.district;
  }

  // ---------- Filtering ----------
  function compute() {
    const raw = state.q.trim();
    const tokens = raw.split(/\s+/).filter(Boolean);
    const normTokens = tokens.map(norm).filter(Boolean);
    const whole = norm(raw);

    const out = [];
    for (const e of DATA) {
      if (state.level !== "all" && e.level !== state.level) continue;
      if (state.province && e.p !== state.province) continue;
      if (state.district && e.d !== state.district) continue;

      let score = 3;
      if (normTokens.length) {
        let ok = true, ownAll = true;
        for (const tk of normTokens) {
          if (/^\d+$/.test(tk)) {
            if (!e.code.startsWith(tk)) { ok = false; break; }
          } else if (!e.hay.includes(tk)) { ok = false; break; }
          else if (!e.own.includes(tk)) ownAll = false;
        }
        if (!ok) continue;
        if (e.code === whole) score = 0;
        else if (whole && (norm(e.kh).startsWith(whole) || norm(e.en).startsWith(whole))) score = 1;
        else if (ownAll) score = 2;
      }
      e._score = score;
      out.push(e);
    }

    const dir = state.dir === "desc" ? -1 : 1;
    if (state.sort === "code") out.sort((a, b) => dir * a.code.localeCompare(b.code));
    else if (state.sort === "name") out.sort((a, b) => dir * name(a).localeCompare(name(b), lang === "km" ? "km" : "en"));
    else out.sort((a, b) => a._score - b._score || a.code.localeCompare(b.code));

    results = out;
    return tokens;
  }

  // ---------- Render ----------
  function render() {
    const tokens = compute();
    const total = results.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (state.page > pages) state.page = pages;
    const start = (state.page - 1) * PAGE_SIZE;
    const slice = results.slice(start, start + PAGE_SIZE);

    els.count.innerHTML = t("count")(total, total ? start + 1 : 0, start + slice.length);
    els.empty.hidden = total > 0;

    els.rows.innerHTML = slice.map((e) => {
      const p = byCode.get(e.p);
      const d = e.level === "commune" ? byCode.get(e.d) : null;
      const parentCell = (x) => x ? `<div class="parent-kh">${esc(x.kh)}</div><div class="parent-en">${esc(x.en)}</div>` : `<span class="muted">—</span>`;
      const mobile = [d, e.level !== "province" ? p : null].filter(Boolean).map(name).join(" · ");
      return `<tr data-code="${e.code}" tabindex="0" aria-selected="${state.selected === e.code}">
        <td><span class="code">${codeHtml(e.code, e.level)}</span></td>
        <td>
          <div class="name-kh">${highlight(e.kh, tokens)}</div>
          <div class="name-en">${highlight(e.en, tokens)}</div>
          ${mobile ? `<div class="mobile-parents">${levelBadge(e)} ${esc(mobile)}</div>` : `<div class="mobile-parents">${levelBadge(e)}</div>`}
        </td>
        <td class="col-type">${levelBadge(e)}</td>
        <td class="col-parent col-d">${parentCell(d)}</td>
        <td class="col-parent col-p">${e.level === "province" ? parentCell(null) : parentCell(p)}</td>
        <td class="col-go">${e.level === "commune" ? "" : `<span class="go">${childCount.get(e.code) || 0} ${esc(t(e.level === "province" ? "districts" : "communes").toLowerCase())}<span class="chev" aria-hidden="true">›</span></span>`}</td>
      </tr>`;
    }).join("");

    document.querySelectorAll(".sort").forEach((b) => {
      if (b.dataset.sort === state.sort) b.dataset.dir = state.dir; else delete b.dataset.dir;
    });

    // Hide parent columns that would repeat the same value on every row.
    const table = document.getElementById("results");
    table.classList.toggle("hide-d", state.level === "province" || state.level === "district" || !!state.district);
    table.classList.toggle("hide-p", state.level === "province" || !!state.province);

    renderPath();
    renderPager(pages);
    renderDetail();
  }

  // Breadcrumb above the table: All provinces › Province › District
  function renderPath() {
    const show = state.province || state.level === "province";
    els.path.hidden = !show;
    if (!show) return;
    const parts = [];
    const atRoot = !state.province;
    parts.push(atRoot
      ? `<span aria-current="page">${esc(t("allProvinces"))}</span>`
      : `<button type="button" data-root>${esc(t("allProvinces"))}</button>`);
    if (state.province) {
      const p = byCode.get(state.province);
      const label = `${esc(typeLabel(p))}${lang === "km" ? "" : " "}${esc(name(p))}`;
      parts.push(state.district ? `<button type="button" data-place="${p.code}">${label}</button>` : `<span aria-current="page">${label}</span>`);
    }
    if (state.district) {
      const d = byCode.get(state.district);
      parts.push(`<span aria-current="page">${esc(typeLabel(d))}${lang === "km" ? "" : " "}${esc(name(d))}</span>`);
    }
    els.path.innerHTML = parts.join(`<span class="sep" aria-hidden="true">›</span>`);
  }

  function renderPager(pages) {
    if (pages <= 1) { els.pager.innerHTML = ""; return; }
    const cur = state.page;
    const nums = new Set([1, pages, cur - 1, cur, cur + 1]);
    const list = [...nums].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
    let html = `<button type="button" data-page="${cur - 1}" ${cur === 1 ? "disabled" : ""} aria-label="Previous">‹</button>`;
    let prev = 0;
    for (const n of list) {
      if (n - prev > 1) html += `<span class="gap">…</span>`;
      html += `<button type="button" data-page="${n}" ${n === cur ? 'aria-current="page"' : ""}>${n}</button>`;
      prev = n;
    }
    html += `<button type="button" data-page="${cur + 1}" ${cur === pages ? "disabled" : ""} aria-label="Next">›</button>`;
    els.pager.innerHTML = html;
  }

  function addressLine(e) {
    const chain = [e];
    if (e.level === "commune") chain.push(byCode.get(e.d));
    if (e.level !== "province") chain.push(byCode.get(e.p));
    const parts = chain.filter(Boolean).map((x) => {
      if (lang === "km") return `${typeLabel(x)}${x.kh}`;
      if (x.type === "sangkat" || x.type === "khan") return `${typeLabel(x)} ${x.en}`;
      return x.en;
    });
    return lang === "km"
      ? `${parts.join(" ")} ${e.code} ${t("cambodia")}`
      : `${parts.join(", ")} ${e.code}, ${t("cambodia")}`;
  }

  function renderDetail() {
    const e = state.selected && byCode.get(state.selected);
    els.detail.classList.toggle("is-empty", !e);
    if (!e) {
      els.detailBody.innerHTML = `<p class="eyebrow">${esc(t("code"))}</p><div class="detail-code"><span class="seg-p">··</span><span class="seg-d">··</span><span class="seg-c">··</span></div><p class="detail-hint">${esc(t("pickRow"))}</p>`;
      return;
    }
    const p = byCode.get(e.p);
    const d = e.level === "commune" ? byCode.get(e.d) : null;
    const segs = [e.code.slice(0, 2), e.code.slice(2, 4), e.code.slice(4)];
    const crumbs = [p && e.level !== "province" ? p : null, d].filter(Boolean).map((x) => `
      <li><span class="crumb-code">${codeHtml(x.code, x.level)}</span>
        <button type="button" data-goto="${x.code}"><span class="crumb-name">${esc(typeLabel(x))} ${esc(x.kh)}</span><span class="crumb-en">${esc(x.en)}</span></button></li>`).join("");

    let childBtn = "";
    if (e.level !== "commune") {
      const childLevel = e.level === "province" ? "district" : "commune";
      const n = DATA.filter((x) => x.level === childLevel && (e.level === "province" ? x.p === e.code : x.d === e.code)).length;
      childBtn = `<button type="button" class="btn-ghost" data-children="${e.code}">${esc(t("showChildren")(n, t(childLevel === "district" ? "childDistricts" : "childCommunes")))}</button>`;
    }

    els.detailBody.innerHTML = `
      <button type="button" class="btn-ghost close-detail" data-close>${esc(t("close"))}</button>
      <div style="display:grid;gap:14px">
        <div class="detail-code" aria-label="${e.code}">
          <span class="seg-p">${segs[0]}</span><span class="${e.level === "province" ? "muted" : "seg-d"}">${segs[1]}</span><span class="${e.level === "commune" ? "seg-c" : "muted"}">${segs[2]}</span>
        </div>
        <div>
          ${levelBadge(e)}
          <h2>${esc(e.kh)}</h2>
          <p class="en">${esc(e.en)}</p>
        </div>
        ${crumbs ? `<ul class="crumbs">${crumbs}</ul>` : ""}
        <div>
          <p class="eyebrow" style="margin-bottom:6px">${esc(t("address"))}</p>
          <div class="address" id="address-line">${esc(addressLine(e))}</div>
        </div>
        <div class="detail-actions">
          <button type="button" class="btn" data-copy="${e.code}">${esc(t("copyCode"))}</button>
          <button type="button" class="btn-ghost" data-copy-address>${esc(t("copyAddress"))}</button>
          ${childBtn}
        </div>
      </div>`;
  }

  // ---------- Clipboard / export ----------
  let toastTimer;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 1800);
  }

  function copy(text, okMsg) {
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      ta.remove();
      toast(ok ? okMsg : t("copyFailed"));
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast(okMsg), fallback);
    } else fallback();
  }

  function toCsv(list) {
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["postal_code", "level", "type", "name_kh", "name_en", "district_code", "district_kh", "district_en", "province_code", "province_kh", "province_en"];
    const lines = list.map((e) => {
      const p = byCode.get(e.p);
      const d = e.level === "commune" ? byCode.get(e.d) : null;
      return [e.code, e.level, e.type, e.kh, e.en, d?.code, d?.kh, d?.en, p?.code, p?.kh, p?.en].map(q).join(",");
    });
    return [header.join(","), ...lines].join("\r\n");
  }

  // ---------- Events ----------
  let qTimer;
  els.q.addEventListener("input", () => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { state.q = els.q.value; state.page = 1; state.sort = null; render(); }, 80);
  });
  $("filters").addEventListener("submit", (ev) => ev.preventDefault());

  els.province.addEventListener("change", () => {
    state.province = els.province.value; state.district = ""; state.page = 1;
    if (state.province && state.level === "province") setLevel("district");
    fillDistricts(); render();
  });
  els.district.addEventListener("change", () => {
    state.district = els.district.value; state.page = 1;
    if (state.district && state.level !== "all") setLevel("commune");
    render();
  });
  document.querySelectorAll('input[name="level"]').forEach((r) =>
    r.addEventListener("change", () => { state.level = r.value; state.page = 1; render(); }));

  document.querySelectorAll(".sort").forEach((b) => b.addEventListener("click", () => {
    if (state.sort === b.dataset.sort) state.dir = state.dir === "asc" ? "desc" : "asc";
    else { state.sort = b.dataset.sort; state.dir = "asc"; }
    render();
  }));

  els.pager.addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-page]");
    if (!b || b.disabled) return;
    state.page = Number(b.dataset.page);
    render();
    document.querySelector(".table-wrap").scrollIntoView({ block: "start", behavior: "smooth" });
  });

  function select(code) {
    state.selected = code;
    els.rows.querySelectorAll("tr").forEach((tr) => tr.setAttribute("aria-selected", String(tr.dataset.code === code)));
    renderDetail();
  }
  // Province -> its districts, district -> its communes, commune -> details.
  function setLevel(level) {
    state.level = level;
    $("lv-" + level).checked = true;
  }
  function openPlace(code) {
    const e = byCode.get(code);
    if (e.level === "commune") { select(code); return; }
    state.province = e.p;
    state.district = e.level === "district" ? e.code : "";
    setLevel(e.level === "province" ? "district" : "commune");
    state.q = ""; els.q.value = "";
    state.page = 1; state.sort = null;
    state.selected = code;
    els.province.value = state.province;
    fillDistricts();
    render();
    document.querySelector(".toolbar").scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function showAllProvinces() {
    Object.assign(state, { q: "", province: "", district: "", page: 1, sort: null });
    els.q.value = ""; els.province.value = "";
    setLevel("province");
    fillDistricts();
    render();
  }

  els.rows.addEventListener("click", (ev) => {
    const tr = ev.target.closest("tr[data-code]");
    if (tr) openPlace(tr.dataset.code);
  });
  els.rows.addEventListener("keydown", (ev) => {
    const tr = ev.target.closest("tr[data-code]");
    if (!tr) return;
    if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openPlace(tr.dataset.code); }
    if (ev.key === "ArrowDown" && tr.nextElementSibling) { ev.preventDefault(); tr.nextElementSibling.focus(); }
    if (ev.key === "ArrowUp" && tr.previousElementSibling) { ev.preventDefault(); tr.previousElementSibling.focus(); }
  });

  function filterTo(code) {
    const e = byCode.get(code);
    state.province = e.p;
    state.district = e.level === "province" ? "" : e.d;
    state.page = 1;
    els.province.value = state.province;
    fillDistricts();
  }

  els.detail.addEventListener("click", (ev) => {
    const target = ev.target.closest("button");
    if (!target) return;
    if (target.dataset.copy) copy(target.dataset.copy, `${t("copied")} ${target.dataset.copy}`);
    else if ("copyAddress" in target.dataset) copy($("address-line").textContent, t("copied"));
    else if ("close" in target.dataset) { state.selected = null; render(); }
    else if (target.dataset.goto) { select(target.dataset.goto); }
    else if (target.dataset.children) openPlace(target.dataset.children);
  });

  $("path").addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    if (b.dataset.root !== undefined) showAllProvinces();
    else openPlace(b.dataset.place);
  });

  $("reset").addEventListener("click", () => {
    Object.assign(state, { q: "", province: "", district: "", level: "all", sort: null, page: 1 });
    els.q.value = ""; $("lv-all").checked = true;
    els.province.value = ""; fillDistricts(); render();
    els.q.focus();
  });

  $("copy-csv").addEventListener("click", () => copy(toCsv(results), t("copiedRows")(results.length)));
  $("download-csv").addEventListener("click", () => {
    const blob = new Blob(["﻿" + toCsv(results)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cambodia-postal-codes.csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  document.querySelectorAll(".lang button").forEach((b) => b.addEventListener("click", () => {
    lang = b.dataset.lang;
    try { localStorage.setItem("kpc.lang", lang); } catch (e) { /* storage unavailable */ }
    applyLang(); render();
  }));

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "/" && document.activeElement !== els.q && !/input|select|textarea/i.test(document.activeElement.tagName)) {
      ev.preventDefault(); els.q.focus();
    }
    if (ev.key === "Escape" && state.selected && window.matchMedia("(max-width: 980px)").matches) {
      state.selected = null; render();
    }
  });

  // ---------- Init ----------
  $("stat-p").textContent = DATA.filter((e) => e.level === "province").length;
  $("stat-d").textContent = DATA.filter((e) => e.level === "district").length;
  $("stat-c").textContent = DATA.filter((e) => e.level === "commune").length;
  // Deep links: index.html#120400 opens that place, index.html?q=Kampot pre-fills the search.
  function applyLocation() {
    const code = decodeURIComponent(location.hash.slice(1));
    if (/^\d{6}$/.test(code) && byCode.has(code)) {
      const e = byCode.get(code);
      filterTo(code);
      if (e.level === "commune") state.district = e.d;
      else setLevel(e.level === "province" ? "district" : "commune");
      state.selected = code;
      return true;
    }
    return false;
  }
  const initialQuery = new URLSearchParams(location.search).get("q");
  if (initialQuery) { state.q = initialQuery; els.q.value = initialQuery; }
  if (!applyLocation() && !window.matchMedia("(max-width: 980px)").matches) state.selected = "120000";
  window.addEventListener("hashchange", () => { if (applyLocation()) render(); });
  applyLang();
  render();
})();
