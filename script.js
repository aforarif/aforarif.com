// aforarif.com: small enhancements, no libraries

// Free audit pop-up: paste your Google Apps Script web app URL here to send submissions to Google Sheets.
// Leave it empty and submissions open the visitor's email app instead (nothing is lost).
const AUDIT_ENDPOINT = "https://script.google.com/macros/s/AKfycbxUJF-ufvuhBO98OCGGkaSv6_FcSDTyKN4JY9b-vRQAQBzzGW5gp8dRfMWFKNkrdXAA/exec";

document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("header");
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");

  // Header shadow on scroll
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Mobile menu
  const closeMenu = () => {
    links.classList.remove("open");
    toggle.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.querySelectorAll("a").forEach(a => a.addEventListener("click", closeMenu));

  // Highlight the nav link for the section in view
  const navMap = {};
  links.querySelectorAll('a[href^="#"]').forEach(a => { navMap[a.getAttribute("href").slice(1)] = a; });
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const link = navMap[entry.target.id];
      if (link && entry.isIntersecting) {
        Object.values(navMap).forEach(l => l.classList.remove("active"));
        link.classList.add("active");
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("section[id]").forEach(s => sectionObserver.observe(s));

  // Reveal on scroll
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

  // Count-up stats
  const countUp = el => {
    const target = Number(el.dataset.count);
    const start = performance.now();
    const duration = 1400;
    const step = now => {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        countUp(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll("[data-count]").forEach(el => counterObserver.observe(el));

  // Typing search box: types each phrase, pauses, deletes, moves to the next
  const typed = document.getElementById("typed");
  // Phrases written the way clients actually search for these services
  const phrases = [
    "Google Ads expert for Shopify",
    "Facebook Ads specialist",
    "Klaviyo email marketing expert",
    "Klaviyo abandoned cart flows",
    "B2B cold email outreach",
    "Instantly.ai cold email setup",
    "Performance Max management",
    "Merchant Center suspension fix",
    "TikTok Ads manager",
    "GA4 conversion tracking",
    "Increase ROAS, lower CPA"
  ];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (typed && !reduceMotion) {
    let p = 0, i = phrases[0].length, deleting = true;
    const tick = () => {
      const word = phrases[p];
      if (deleting) {
        i--;
        typed.textContent = word.slice(0, i);
        if (i === 0) { deleting = false; p = (p + 1) % phrases.length; return setTimeout(tick, 350); }
        return setTimeout(tick, 35);
      }
      const next = phrases[p];
      i++;
      typed.textContent = next.slice(0, i);
      if (i === next.length) { deleting = true; return setTimeout(tick, 1800); }
      setTimeout(tick, 70 + Math.random() * 50);
    };
    setTimeout(tick, 2200); // first phrase is already visible, so start by deleting it
  }

  // Pricing buttons pre-select the matching service in the contact form
  document.querySelectorAll("[data-service]").forEach(btn => {
    btn.addEventListener("click", () => {
      const select = document.querySelector('#contactForm select[name="service"]');
      if (select) select.value = btn.dataset.service;
    });
  });

  // Hide Upwork links until a real profile URL is set in index.html
  document.querySelectorAll("[data-upwork]").forEach(a => {
    if (!a.getAttribute("href").startsWith("http")) a.remove();
  });

  // Logo slider: clone the logos once so the right-to-left loop is seamless
  const track = document.querySelector(".marquee-track");
  if (track && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    [...track.children].forEach(li => {
      const copy = li.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      track.appendChild(copy);
    });
    // Same comfortable reading speed on every screen: ~55px/s on desktop, ~38px/s on phones
    const setSpeed = () => {
      const pxPerSecond = window.innerWidth < 600 ? 38 : 55;
      track.style.setProperty("--marquee-duration", (track.scrollWidth / 2 / pxPerSecond).toFixed(1) + "s");
    };
    setSpeed();
    window.addEventListener("load", setSpeed);
    window.addEventListener("resize", setSpeed);
  }

  // Back to top button: show after scrolling down a screen
  const toTop = document.getElementById("toTop");
  const onScrollTop = () => toTop.classList.toggle("show", window.scrollY > window.innerHeight * 0.8);
  onScrollTop();
  window.addEventListener("scroll", onScrollTop, { passive: true });
  toTop.addEventListener("click", e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    history.replaceState(null, "", location.pathname);
  });

  // Free audit pop-up
  (() => {
    const box = document.getElementById("audit");
    if (!box) return;
    const tab = document.getElementById("auditTab");
    const form = document.getElementById("auditForm");
    const msg = document.getElementById("auditMsg");
    const submitBtn = document.getElementById("auditSubmit");
    const KEY = "aforarif-audit";
    const getState = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
    const setState = v => { try { localStorage.setItem(KEY, v); } catch (e) { /* ignore */ } };

    const open = (focus) => {
      tab.hidden = true;
      box.hidden = false;
      requestAnimationFrame(() => box.classList.add("open"));
      if (focus) setTimeout(() => form.querySelector("input").focus(), 300);
    };
    const minimise = () => {
      box.classList.remove("open");
      setTimeout(() => { box.hidden = true; }, 300);
      if (getState() !== "done") { tab.hidden = false; setState("min"); }
    };

    document.getElementById("auditClose").addEventListener("click", minimise);
    tab.addEventListener("click", () => open(true));
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !box.hidden) minimise(); });

    // First visit: open after 12 seconds or once a quarter of the page is scrolled
    const state = getState();
    if (state === "min") tab.hidden = false;
    else if (state !== "done") {
      let shown = false;
      const auto = () => {
        if (shown) return; shown = true;
        window.removeEventListener("scroll", onScrollAudit);
        open(false);
      };
      const onScrollAudit = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (max > 0 && window.scrollY / max > 0.25) auto();
      };
      window.addEventListener("scroll", onScrollAudit, { passive: true });
      setTimeout(auto, 12000);
    }

    form.addEventListener("reset", () => {
      msg.textContent = "";
      form.querySelectorAll(".invalid").forEach(i => i.classList.remove("invalid"));
    });

    form.addEventListener("submit", async e => {
      e.preventDefault();
      const f = form.elements;
      const name = f.name.value.trim(), email = f.email.value.trim();
      let website = f.website.value.trim();
      const bad = [];
      f.name.classList.toggle("invalid", !name); if (!name) bad.push("your name");
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
      f.email.classList.toggle("invalid", !emailOk); if (!emailOk) bad.push("a valid email");
      const siteOk = /^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(website);
      f.website.classList.toggle("invalid", !siteOk); if (!siteOk) bad.push("your website");
      if (bad.length) { msg.textContent = "Please add " + bad.join(", ").replace(/, ([^,]*)$/, " and $1") + "."; return; }
      msg.textContent = "";
      if (!/^https?:\/\//i.test(website)) website = "https://" + website;

      const done = () => {
        document.getElementById("auditBody").hidden = true;
        document.getElementById("auditDone").hidden = false;
        setState("done");
      };
      if (f.company.value) { done(); return; } // spam bot filled the hidden field

      const data = { name, email, website, page: location.href, source: "Free audit pop-up" };
      if (AUDIT_ENDPOINT) {
        submitBtn.disabled = true; submitBtn.textContent = "Sending...";
        try {
          await fetch(AUDIT_ENDPOINT, { method: "POST", mode: "no-cors", body: new URLSearchParams(data) });
          done();
        } catch (err) {
          msg.textContent = "Couldn't send right now. Please try again or email contact@aforarif.com.";
        } finally {
          submitBtn.disabled = false; submitBtn.textContent = "Free Audit";
        }
      } else {
        const body = `Name: ${name}\nEmail: ${email}\nWebsite: ${website}\n\nI'd like a free ads audit.`;
        window.location.href = `mailto:contact@aforarif.com?subject=${encodeURIComponent("Free audit request: " + name)}&body=${encodeURIComponent(body)}`;
        done();
      }
    });
  })();

  // Footer year
  document.getElementById("year").textContent = new Date().getFullYear();

  // Contact form: validate, then open the visitor's email app with the message filled in
  const form = document.getElementById("contactForm");
  const note = document.getElementById("formNote");
  form.addEventListener("submit", e => {
    e.preventDefault();
    let valid = true;
    form.querySelectorAll("[required]").forEach(field => {
      let ok = field.value.trim() !== "" && field.checkValidity();
      if (ok && field.dataset.kind === "website") ok = /^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(field.value.trim());
      field.classList.toggle("invalid", !ok);
      if (!ok) valid = false;
    });
    if (!valid) {
      note.textContent = "Please fill in your full name, a valid email and your website.";
      note.classList.add("error");
      return;
    }
    const data = new FormData(form);
    let site = data.get("website").trim();
    if (!/^https?:\/\//i.test(site)) site = "https://" + site;
    const subject = `New enquiry from ${data.get("name")}`;
    const body =
      `Full name: ${data.get("name")}\n` +
      `Phone: ${data.get("phone").trim() || "Not provided"}\n` +
      `Email: ${data.get("email")}\n` +
      `Website: ${site}\n` +
      `Service: ${data.get("service")}\n\n` +
      `${data.get("message").trim() || "No message added."}`;
    window.location.href =
      `mailto:contact@aforarif.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    note.textContent = "Your email app should open now. Thanks for reaching out!";
    note.classList.remove("error");
  });
});
