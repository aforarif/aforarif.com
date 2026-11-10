// Google Ads Preview Tool (Performance Max)
// Runs entirely in the browser. Text is remembered on this device; images are never uploaded or stored.

(() => {
  const LIMITS = { headline: 30, description: 90, shortDescription: 60, bizName: 25 };
  const COUNTS = { headlines: 5, descriptions: 4 };
  const STORE_KEY = "aforarif-gads-preview-v1";
  const MAX_FILE_BYTES = 5 * 1024 * 1024; // Google's 5 MB image limit

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const len = s => [...s].length;

  const form = $("#adForm");
  const headlinesBox = $("#headlines");
  const descriptionsBox = $("#descriptions");
  const preview = $("#preview");
  const adsGrid = $("#adsGrid");
  const images = { logo: null, square: null, landscape: null };
  let activeFormat = "all";
  let resetting = false;

  // ---------- Build headline and description fields ----------
  function buildFields(box, kind, count, max) {
    for (let i = 1; i <= count; i++) {
      const id = `${kind}${i}`;
      const label = document.createElement("label");
      label.className = "field";
      label.innerHTML = `
        <span class="field-top"><span>${kind === "h" ? "Headline" : "Description"} ${i}</span><span class="count" data-for="${id}"></span></span>
        <input type="text" id="${id}" data-max="${max}" data-kind="${kind}" autocomplete="off">
        <span class="warn" data-warn="${id}"></span>`;
      box.appendChild(label);
    }
  }
  buildFields(headlinesBox, "h", COUNTS.headlines, LIMITS.headline);
  buildFields(descriptionsBox, "d", COUNTS.descriptions, LIMITS.description);

  const textInputs = $$('input[type="text"], input[type="url"]', form);

  // ---------- Placeholders that show good practice ----------
  // Agency demo (aforarif.com): used as input hints, and for the whole preview when the form is empty
  const DEMO = {
    biz: "aforarif.com",
    url: "https://aforarif.com",
    heads: ["Google & Meta Ads Specialist", "Up to 13x ROAS for Clients", "$200K+ Ad Spend Managed", "Book a Free Consultation", "Scale Your Store Profitably"],
    long: "Profitable Google Ads, Meta Ads and Email Marketing for E-commerce and Service Brands",
    descs: [
      "Lead media buyer with 7+ years in paid media. Book a free consultation and audit today.",
      "Lower your CPA and scale ROAS with data-driven ads.",
      "Google Ads, Meta Ads, Klaviyo email and B2B outreach, managed by a proven specialist.",
      "Trusted by brands in the US, UK and Europe, with clear monthly reporting."
    ],
    images: { logo: "demo/logo.png", square: "demo/square.jpg", landscape: "demo/landscape.jpg" }
  };
  // Neutral placeholders for gaps once a client has started entering their own assets
  const BLANK = {
    biz: "Your Business",
    heads: ["Your Headline Here", "Your Second Headline", "Your Third Headline"],
    descs: ["Your description appears here."]
  };
  DEMO.heads.forEach((v, i) => { const el = $("#h" + (i + 1)); if (el) el.placeholder = "e.g. " + v; });
  DEMO.descs.forEach((v, i) => { const el = $("#d" + (i + 1)); if (el) el.placeholder = "e.g. " + v; });
  $("#lh1").placeholder = "e.g. " + DEMO.long;
  $("#bizName").placeholder = "e.g. " + DEMO.biz;
  $("#finalUrl").placeholder = "e.g. " + DEMO.url;

  // ---------- Counters and copy checks ----------
  const ACRONYMS = new Set(["ROAS", "PPC", "SEO", "SEM", "CPA", "CPC", "CPM", "CTR", "GA4", "USA", "B2B", "B2C", "SAAS", "HVAC", "FAQS", "NASA", "UEFA"]);
  const capsWords = v => (v.match(/\b[A-Z0-9]{4,}\b/g) || []).filter(w => /[A-Z]{2}/.test(w) && !ACRONYMS.has(w));
  function updateCount(input) {
    const max = Number(input.dataset.max);
    const counter = $(`.count[data-for="${input.id}"]`);
    if (!counter || !max) return;
    const n = len(input.value);
    counter.textContent = `${n}/${max}`;
    counter.classList.toggle("near", n >= max - 5 && n < max);
    counter.classList.toggle("full", n === max);
    counter.classList.toggle("over", n > max);
    input.classList.toggle("over", n > max);
  }

  function checkCopy() {
    const heads = $$('input[data-kind="h"]');
    const seen = new Map();
    heads.forEach((input, i) => {
      const v = input.value.trim();
      const warn = $(`[data-warn="${input.id}"]`);
      const notes = [];
      if (len(v) > LIMITS.headline) notes.push(`${len(v) - LIMITS.headline} characters over the 30 limit. Google won't accept it as is.`);
      if (v.includes("!")) notes.push("Google doesn't allow exclamation marks in headlines.");
      if (capsWords(v).length) notes.push("Avoid words in ALL CAPS; Google may disapprove them.");
      const key = v.toLowerCase();
      if (v && seen.has(key)) notes.push(`Same as headline ${seen.get(key)}. Use unique headlines.`);
      if (v && !seen.has(key)) seen.set(key, i + 1);
      warn.textContent = notes.join(" ");
    });
    const lh = $("#lh1"), lhWarn = $('[data-warn="lh1"]');
    if (lh && lhWarn) {
      const n = [];
      if (len(lh.value.trim()) > 90) n.push(`${len(lh.value.trim()) - 90} characters over the 90 limit.`);
      if (lh.value.includes("!")) n.push("Google doesn't allow exclamation marks in headlines.");
      lhWarn.textContent = n.join(" ");
    }
    $$('input[data-kind="d"]').forEach(input => {
      const warn = $(`[data-warn="${input.id}"]`);
      const v = input.value.trim(), n = [];
      if (len(v) > LIMITS.description) n.push(`${len(v) - LIMITS.description} characters over the 90 limit. Google won't accept it as is.`);
      if (/!.*!/.test(v)) n.push("Use at most one exclamation mark in descriptions.");
      warn.textContent = n.join(" ");
    });
  }

  // ---------- Remember text on this device ----------
  function save() {
    try {
      const data = {};
      textInputs.forEach(i => { data[i.id] = i.value; });
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (e) { /* storage unavailable: ignore */ }
  }
  function restore() {
    try {
      const data = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      textInputs.forEach(i => { if (typeof data[i.id] === "string") i.value = data[i.id]; });
    } catch (e) { /* ignore */ }
  }

  textInputs.forEach(input => {
    input.addEventListener("input", () => {
      updateCount(input);
      input.classList.remove("invalid");
      checkCopy();
      save();
      if (!preview.hidden) renderChecklist();
    });
  });
  restore();
  textInputs.forEach(updateCount);
  checkCopy();

  // ---------- Image uploads ----------
  function setMsg(slotEl, text, type) {
    const msg = $(".up-msg", slotEl);
    msg.textContent = text;
    msg.className = "up-msg" + (type ? " " + type : "");
  }

  function clearSlot(slotEl) {
    const slot = slotEl.dataset.slot;
    if (images[slot]) URL.revokeObjectURL(images[slot].url);
    images[slot] = null;
    const img = $(".drop img", slotEl);
    img.hidden = true; img.removeAttribute("src");
    $(".drop-empty", slotEl).hidden = false;
    $(".drop", slotEl).classList.remove("has-img");
    $(".remove", slotEl).hidden = true;
    $('input[type="file"]', slotEl).value = "";
    setMsg(slotEl, "");
    if (!preview.hidden && !resetting) { render(); renderChecklist(); }
  }

  // Google's rules for each image slot; problems are reported, never blocking
  function imageIssues(slotEl, w, h, size) {
    const out = [];
    const name = slotEl.querySelector(".up-title").textContent;
    const minW = Number(slotEl.dataset.minW), minH = Number(slotEl.dataset.minH);
    const ratio = Number(slotEl.dataset.ratio);
    const rec = slotEl.dataset.rec.split(" x ").map(Number);
    if (w < minW || h < minH) out.push({ level: "req", text: `${name}: ${w} x ${h} is below Google's minimum of ${minW} x ${minH}.` });
    else if (w < rec[0]) out.push({ level: "rec", text: `${name}: ${w} x ${h} works, but ${slotEl.dataset.rec} is recommended for sharp results.` });
    if (Math.abs(w / h - ratio) / ratio > 0.02) out.push({ level: "rec", text: `${name}: ${w} x ${h} isn't ${ratio === 1 ? "square (1:1)" : "1.91:1"}, so Google will crop it. Use ${slotEl.dataset.rec}.` });
    if (size > MAX_FILE_BYTES) out.push({ level: "req", text: `${name}: file is over 5 MB, Google's limit. Compress it before uploading to Google Ads.` });
    return out;
  }

  function handleFile(slotEl, file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
      setMsg(slotEl, "Please upload a PNG, JPG, WebP or GIF image.", "err"); return;
    }
    const url = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => {
      const w = probe.naturalWidth, h = probe.naturalHeight;
      const minW = Number(slotEl.dataset.minW), minH = Number(slotEl.dataset.minH);
      const ratio = Number(slotEl.dataset.ratio);
      if (images[slotEl.dataset.slot]) URL.revokeObjectURL(images[slotEl.dataset.slot].url);
      const issues = imageIssues(slotEl, w, h, file.size);
      images[slotEl.dataset.slot] = { url, w, h, issues };
      const img = $(".drop img", slotEl);
      img.src = url; img.hidden = false;
      $(".drop-empty", slotEl).hidden = true;
      $(".drop", slotEl).classList.add("has-img");
      $(".remove", slotEl).hidden = false;

      if (!preview.hidden) { render(); renderChecklist(); }
      if (!issues.length) setMsg(slotEl, `${w} x ${h}: perfect size.`, "ok");
      else setMsg(slotEl, issues.map(i => i.text).join(" "), issues.some(i => i.level === "req") ? "err" : "warn");
    };
    probe.onerror = () => { URL.revokeObjectURL(url); setMsg(slotEl, "This image couldn't be read. Try another file.", "err"); };
    probe.src = url;
  }

  $$(".upload").forEach(slotEl => {
    const input = $('input[type="file"]', slotEl);
    const drop = $(".drop", slotEl);
    input.addEventListener("change", () => handleFile(slotEl, input.files[0]));
    $(".remove", slotEl).addEventListener("click", () => clearSlot(slotEl));
    ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("dragover"); }));
    ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("dragover"); }));
    drop.addEventListener("drop", e => handleFile(slotEl, e.dataTransfer.files[0]));
  });

  // ---------- Collect inputs (anything can be missing) ----------
  function raw() {
    return {
      heads: $$('input[data-kind="h"]').map(i => i.value.trim()).filter(Boolean),
      descs: $$('input[data-kind="d"]').map(i => i.value.trim()).filter(Boolean),
      long: $("#lh1").value.trim(),
      biz: $("#bizName").value.trim(),
      url: $("#finalUrl").value.trim()
    };
  }
  function isDemo() {
    const r = raw();
    return !r.heads.length && !r.descs.length && !r.long && !r.biz && !r.url && !images.logo && !images.square && !images.landscape;
  }
  let demoMode = false;
  function collect() {
    const r = raw();
    if (demoMode) return { heads: DEMO.heads, descs: DEMO.descs, long: DEMO.long, biz: DEMO.biz, url: DEMO.url };
    return {
      heads: r.heads.length ? r.heads : BLANK.heads,
      descs: r.descs.length ? r.descs : BLANK.descs,
      long: r.long,
      biz: r.biz || BLANK.biz,
      url: r.url
    };
  }

  // ---------- Launch checklist shown above the previews ----------
  function checklist() {
    const r = raw(), items = [];
    const add = (level, text) => items.push({ level, text });
    if (demoMode) {
      add("demo", "This is a demo ad for aforarif.com. Fill in the fields above to preview your own ads.");
      return items;
    }
    if (!r.heads.length) add("req", "Add at least 3 headlines. Placeholder headlines are shown for now.");
    else if (r.heads.length < 3) add("req", `Add at least 3 headlines. Google requires 3 (you have ${r.heads.length}).`);
    else if (r.heads.length < 5) add("rec", `Add ${5 - r.heads.length} more headline${r.heads.length === 4 ? "" : "s"}. More headlines give Google more combinations.`);
    const longHeads = r.heads.filter(h => len(h) > LIMITS.headline).length;
    if (longHeads) add("req", `${longHeads} headline${longHeads > 1 ? "s are" : " is"} over 30 characters.`);
    if (new Set(r.heads.map(h => h.toLowerCase())).size !== r.heads.length) add("rec", "Some headlines are duplicates. Make each one unique.");
    if (r.heads.some(h => h.includes("!")) || r.long.includes("!")) add("req", "Remove exclamation marks from headlines. Google disapproves them.");
    if (r.heads.some(h => capsWords(h).length)) add("rec", "Avoid ALL CAPS words in headlines.");
    if (!r.long) add("req", "Add a long headline. Performance Max requires at least one.");
    else if (len(r.long) > 90) add("req", "Long headline is over 90 characters.");
    if (!r.descs.length) add("req", "Add at least 2 descriptions. A placeholder is shown for now.");
    else {
      if (r.descs.length < 2) add("req", "Add at least 2 descriptions. Google requires 2.");
      if (!r.descs.some(d => len(d) <= LIMITS.shortDescription)) add("req", "Make at least one description 60 characters or fewer.");
      const longD = r.descs.filter(d => len(d) > LIMITS.description).length;
      if (longD) add("req", `${longD} description${longD > 1 ? "s are" : " is"} over 90 characters.`);
    }
    if (!r.biz) add("req", "Add your business name. Google shows it in every ad.");
    else if (len(r.biz) > LIMITS.bizName) add("req", "Business name is over 25 characters.");
    if (!r.url) add("rec", "Add your Final URL to show your website address in Search ads.");
    else if (domainOf(r.url) === "yourwebsite.com") add("req", "The Final URL doesn't look valid.");
    [["logo", "Upload a business logo. Performance Max requires one."], ["square", "Upload a square image (1200 x 1200). Performance Max requires one."], ["landscape", "Upload a landscape image (1200 x 628). Performance Max requires one."]]
      .forEach(([slot, msg]) => { if (!images[slot]) add("req", msg); else images[slot].issues.forEach(i => add(i.level, i.text)); });
    return items;
  }

  function renderChecklist() {
    const box = $("#checklist");
    const items = checklist();
    const order = { req: 0, rec: 1, demo: 2 };
    items.sort((a, b) => order[a.level] - order[b.level]);
    const fixes = items.filter(i => i.level !== "demo").length;
    box.innerHTML = "";
    box.className = "checklist " + (items.some(i => i.level === "req") ? "has-req" : fixes ? "has-rec" : items.length ? "has-demo" : "ok");
    const head = document.createElement("div");
    head.className = "cl-head";
    head.textContent = !items.length ? "Ready to launch: every asset meets Google's requirements."
      : fixes ? `${fixes} thing${fixes > 1 ? "s" : ""} to fix before launch` : "Demo preview";
    box.appendChild(head);
    if (!items.length) return;
    const ul = document.createElement("ul");
    items.forEach(i => {
      const li = document.createElement("li");
      li.className = "cl-" + i.level;
      const tag = document.createElement("span");
      tag.className = "cl-tag";
      tag.textContent = i.level === "req" ? "Required" : i.level === "rec" ? "Recommended" : "Demo";
      li.append(tag, document.createTextNode(i.text));
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  // ---------- Small DOM helper (text is always set safely) ----------
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  function media(slot, cls, label) {
    const src = images[slot] ? images[slot].url : demoMode ? DEMO.images[slot] : null;
    if (src) { const img = el("img", cls); img.src = src; img.alt = ""; return img; }
    const ph = el("div", cls + " ph", label || (slot === "square" ? "Square image" : "Landscape image"));
    return ph;
  }
  function logo(cls, biz) {
    const src = images.logo ? images.logo.url : demoMode ? DEMO.images.logo : null;
    if (src) { const img = el("img", "ad-logo " + (cls || "")); img.src = src; img.alt = ""; return img; }
    return el("div", "ad-logo ph " + (cls || ""), (biz || "A").trim().charAt(0).toUpperCase());
  }

  // ---------- Random combinations ----------
  const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shortDesc = descs => pick(descs.filter(d => len(d) <= LIMITS.shortDescription)) || descs[0];
  const longOr = d => (d.long && Math.random() > 0.35 ? d.long : pick(d.heads));
  function domainOf(url) {
    if (!url) return "yourwebsite.com";
    try { return new URL(/^https?:\/\//i.test(url) ? url : "https://" + url).hostname.replace(/^www\./, ""); } catch (e) { return "yourwebsite.com"; }
  }

  // ---------- Ad formats ----------
  function searchAd(d) {
    const box = el("div", "ad ad-search");
    const src = el("div", "src");
    src.appendChild(logo("", d.biz));
    const st = el("div", "src-txt");
    st.appendChild(el("span", "spons", "Sponsored"));
    const nameLine = el("span", "src-name", d.biz || "Your Business");
    st.appendChild(nameLine);
    st.appendChild(el("span", "src-url", "https://" + domainOf(d.url)));
    src.appendChild(st);
    box.appendChild(src);
    const n = d.heads.length >= 3 && Math.random() > 0.4 ? 3 : 2;
    box.appendChild(el("h3", "", shuffle(d.heads).slice(0, n).join(" | ")));
    const descs = shuffle(d.descs);
    box.appendChild(el("p", "", Math.random() > 0.5 && descs[1] ? descs[0] + " " + descs[1] : descs[0]));
    return box;
  }

  function displayAd(d) {
    const box = el("div", "ad ad-display");
    box.appendChild(media("landscape", "media"));
    const body = el("div", "body");
    body.appendChild(el("h3", "", longOr(d)));
    body.appendChild(el("p", "", pick(d.descs)));
    const foot = el("div", "foot");
    foot.appendChild(logo("", d.biz));
    foot.appendChild(el("span", "muted", d.biz || "Your Business"));
    foot.appendChild(el("span", "cta", "Open"));
    body.appendChild(foot);
    box.appendChild(body);
    return box;
  }

  function nativeAd(d) {
    const box = el("div", "ad ad-native");
    box.appendChild(media("square", "media"));
    const body = el("div", "body");
    body.appendChild(el("h3", "", pick(d.heads)));
    body.appendChild(el("p", "", shortDesc(d.descs)));
    body.appendChild(el("span", "muted", "Ad · " + (d.biz || "Your Business")));
    box.appendChild(body);
    return box;
  }

  function youtubeAd(d) {
    const box = el("div", "ad ad-yt");
    box.appendChild(media("landscape", "media"));
    const body = el("div", "body");
    body.appendChild(logo("", d.biz));
    const t = el("div");
    t.appendChild(el("h3", "", d.long && Math.random() > 0.4 ? d.long : pick(d.heads) + " | " + shortDesc(d.descs)));
    const meta = el("div", "yt-meta");
    meta.append(el("span", "spons", "Sponsored"), document.createTextNode(" · " + (d.biz || "Your Business")));
    t.appendChild(meta);
    body.appendChild(t);
    box.appendChild(body);
    box.appendChild(el("span", "cta", "Learn more"));
    return box;
  }

  function gmailAd(d, expanded) {
    const box = el("div", "ad ad-gmail");
    const row = el("div", "row");
    row.appendChild(logo("", d.biz));
    const txt = el("div", "txt");
    const top = el("div", "top");
    top.append(el("span", "gm-badge", "Ad"), el("span", "", d.biz || "Your Business"));
    txt.appendChild(top);
    const head = pick(d.heads);
    txt.appendChild(el("h3", "", head));
    txt.appendChild(el("p", "", shortDesc(d.descs)));
    row.appendChild(txt);
    box.appendChild(row);
    if (expanded) {
      const open = el("div", "open");
      open.appendChild(media(images.landscape || !images.square ? "landscape" : "square", "media"));
      const body = el("div", "body");
      if (d.long) body.appendChild(el("h3", "gm-long", d.long));
      body.appendChild(el("p", "", pick(d.descs)));
      body.appendChild(el("span", "cta", "Visit site"));
      open.appendChild(body);
      box.appendChild(open);
    }
    return box;
  }

  function discoverAd(d, useSquare) {
    const box = el("div", "ad ad-discover");
    const slot = useSquare && images.square ? "square" : "landscape";
    const m = media(slot, "media");
    if (slot === "square") m.style.aspectRatio = "1";
    box.appendChild(m);
    const body = el("div", "body");
    const src = el("div", "src");
    src.appendChild(logo("", d.biz));
    src.append(el("span", "", d.biz || "Your Business"), el("span", "", "·"), el("span", "spons", "Sponsored"));
    body.appendChild(src);
    body.appendChild(el("h3", "", d.long && Math.random() > 0.4 ? d.long : shuffle(d.heads).slice(0, 2).join(" | ")));
    body.appendChild(el("span", "cta", "Learn more"));
    box.appendChild(body);
    return box;
  }

  function render() {
    demoMode = isDemo();
    const d = collect();
    const cards = [
      ["search", "Google Search", searchAd(d)],
      ["display", "Display · landscape", displayAd(d)],
      ["youtube", "YouTube home feed", youtubeAd(d)],
      ["gmail", "Gmail · inbox", gmailAd(d, false)],
      ["discover", "Discover feed", discoverAd(d, false)],
      ["search", "Google Search", searchAd(d)],
      ["display", "Display · native square", nativeAd(d)],
      ["gmail", "Gmail · opened", gmailAd(d, true)],
      ["display", "Display · landscape", displayAd(d)],
      ["youtube", "YouTube home feed", youtubeAd(d)],
      ["discover", "Discover feed", discoverAd(d, true)],
      ["display", "Display · native square", nativeAd(d)],
      ["search", "Google Search", searchAd(d)]
    ];
    adsGrid.innerHTML = "";
    cards.forEach(([fmt, label, node]) => {
      const wrap = el("div", "ad-wrap");
      wrap.dataset.format = fmt;
      const lab = el("div", "ad-label");
      lab.appendChild(el("span", "", label));
      wrap.append(lab, node);
      wrap.hidden = activeFormat !== "all" && activeFormat !== fmt;
      adsGrid.appendChild(wrap);
    });
  }

  // ---------- Buttons ----------
  form.addEventListener("submit", e => {
    e.preventDefault();
    render();
    renderChecklist();
    preview.hidden = false;
    preview.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#shuffleBtn").addEventListener("click", render);

  $$(".format-tab").forEach(tab => tab.addEventListener("click", () => {
    activeFormat = tab.dataset.format;
    $$(".format-tab").forEach(t => t.classList.toggle("active", t === tab));
    $$(".ad-wrap", adsGrid).forEach(w => { w.hidden = activeFormat !== "all" && w.dataset.format !== activeFormat; });
  }));

  $("#resetBtn").addEventListener("click", () => {
    textInputs.forEach(i => { i.value = ""; i.classList.remove("invalid"); updateCount(i); });
    resetting = true;
    $$(".upload").forEach(clearSlot);
    resetting = false;
    checkCopy();
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    preview.hidden = true;
    adsGrid.innerHTML = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Footer year
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
