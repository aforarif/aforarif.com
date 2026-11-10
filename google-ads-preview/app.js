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

  // ---------- Build headline and description fields ----------
  function buildFields(box, kind, count, max) {
    for (let i = 1; i <= count; i++) {
      const id = `${kind}${i}`;
      const label = document.createElement("label");
      label.className = "field";
      label.innerHTML = `
        <span class="field-top"><span>${kind === "h" ? "Headline" : "Description"} ${i}</span><span class="count" data-for="${id}"></span></span>
        <input type="text" id="${id}" maxlength="${max}" data-max="${max}" data-kind="${kind}" autocomplete="off">
        <span class="warn" data-warn="${id}"></span>`;
      box.appendChild(label);
    }
  }
  buildFields(headlinesBox, "h", COUNTS.headlines, LIMITS.headline);
  buildFields(descriptionsBox, "d", COUNTS.descriptions, LIMITS.description);

  const textInputs = $$('input[type="text"], input[type="url"]', form);

  // ---------- Placeholders that show good practice ----------
  const placeholders = {
    h1: "e.g. Handmade Cornish Candles", h2: "e.g. Free UK Delivery Over £40", h3: "e.g. Shop Our Bestsellers",
    h4: "e.g. Rated 4.9 by 2,000+ Buyers", h5: "e.g. New Autumn Collection",
    d1: "e.g. Hand-poured soy candles made in Cornwall. Order today for free gift wrapping.",
    d2: "e.g. Natural scents, clean burn, made to last.",
    d3: "e.g. Bundle and save on gift sets. Free UK delivery on orders over £40.",
    d4: "e.g. Join 20,000+ happy customers and find your new favourite scent today."
  };
  Object.entries(placeholders).forEach(([id, ph]) => { const el = $("#" + id); if (el) el.placeholder = ph; });

  // ---------- Counters and copy checks ----------
  function updateCount(input) {
    const max = Number(input.dataset.max);
    const counter = $(`.count[data-for="${input.id}"]`);
    if (!counter || !max) return;
    const n = len(input.value);
    counter.textContent = `${n}/${max}`;
    counter.classList.toggle("near", n >= max - 5 && n < max);
    counter.classList.toggle("full", n >= max);
  }

  function checkCopy() {
    const heads = $$('input[data-kind="h"]');
    const seen = new Map();
    heads.forEach((input, i) => {
      const v = input.value.trim();
      const warn = $(`[data-warn="${input.id}"]`);
      const notes = [];
      if (v.includes("!")) notes.push("Google doesn't allow exclamation marks in headlines.");
      if (/\b[A-Z]{4,}\b/.test(v)) notes.push("Avoid words in ALL CAPS; Google may disapprove them.");
      const key = v.toLowerCase();
      if (v && seen.has(key)) notes.push(`Same as headline ${seen.get(key)}. Use unique headlines.`);
      if (v && !seen.has(key)) seen.set(key, i + 1);
      warn.textContent = notes.join(" ");
    });
    const lh = $("#lh1"), lhWarn = $('[data-warn="lh1"]');
    if (lh && lhWarn) lhWarn.textContent = lh.value.includes("!") ? "Google doesn't allow exclamation marks in headlines." : "";
    $$('input[data-kind="d"]').forEach(input => {
      const warn = $(`[data-warn="${input.id}"]`);
      const v = input.value;
      warn.textContent = /!.*!/.test(v) ? "Use at most one exclamation mark in descriptions." : "";
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
  }

  function handleFile(slotEl, file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
      setMsg(slotEl, "Please upload a PNG, JPG, WebP or GIF image.", "err"); return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setMsg(slotEl, "This file is over 5 MB, Google's limit for image assets. Please compress it.", "err"); return;
    }
    const url = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => {
      const w = probe.naturalWidth, h = probe.naturalHeight;
      const minW = Number(slotEl.dataset.minW), minH = Number(slotEl.dataset.minH);
      const ratio = Number(slotEl.dataset.ratio);
      if (w < minW || h < minH) {
        URL.revokeObjectURL(url);
        setMsg(slotEl, `${w} x ${h} is too small. Minimum is ${minW} x ${minH}; ${slotEl.dataset.rec} recommended.`, "err");
        return;
      }
      if (images[slotEl.dataset.slot]) URL.revokeObjectURL(images[slotEl.dataset.slot].url);
      images[slotEl.dataset.slot] = { url, w, h };
      const img = $(".drop img", slotEl);
      img.src = url; img.hidden = false;
      $(".drop-empty", slotEl).hidden = true;
      $(".drop", slotEl).classList.add("has-img");
      $(".remove", slotEl).hidden = false;

      const off = Math.abs(w / h - ratio) / ratio;
      const rec = slotEl.dataset.rec.split(" x ").map(Number);
      if (off > 0.02) {
        setMsg(slotEl, `${w} x ${h} isn't ${ratio === 1 ? "square (1:1)" : "1.91:1"}. Google will crop it; ${slotEl.dataset.rec} is ideal.`, "warn");
      } else if (w < rec[0]) {
        setMsg(slotEl, `${w} x ${h} works. ${slotEl.dataset.rec} is recommended for the sharpest results.`, "warn");
      } else {
        setMsg(slotEl, `${w} x ${h}: perfect size.`, "ok");
      }
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
  const FALLBACK = {
    heads: ["Your Headline Here", "Your Second Headline", "Your Third Headline"],
    descs: ["Your description appears here. Add one to see how it reads."]
  };
  function collect() {
    const heads = $$('input[data-kind="h"]').map(i => i.value.trim()).filter(Boolean);
    const descs = $$('input[data-kind="d"]').map(i => i.value.trim()).filter(Boolean);
    return {
      heads: heads.length ? heads : FALLBACK.heads,
      descs: descs.length ? descs : FALLBACK.descs,
      long: $("#lh1").value.trim(),
      biz: $("#bizName").value.trim(),
      url: $("#finalUrl").value.trim()
    };
  }

  // ---------- Small DOM helper (text is always set safely) ----------
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  function media(slot, cls, label) {
    if (images[slot]) { const img = el("img", cls); img.src = images[slot].url; img.alt = ""; return img; }
    const ph = el("div", cls + " ph", label || (slot === "square" ? "Square image" : "Landscape image"));
    return ph;
  }
  function logo(cls, biz) {
    if (images.logo) { const img = el("img", "ad-logo " + (cls || "")); img.src = images.logo.url; img.alt = ""; return img; }
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
    $$(".upload").forEach(clearSlot);
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
