// aforarif.com: small enhancements, no libraries

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

  // Footer year
  document.getElementById("year").textContent = new Date().getFullYear();

  // Contact form: validate, then open the visitor's email app with the message filled in
  const form = document.getElementById("contactForm");
  const note = document.getElementById("formNote");
  form.addEventListener("submit", e => {
    e.preventDefault();
    let valid = true;
    form.querySelectorAll("[required]").forEach(field => {
      const ok = field.value.trim() !== "" && field.checkValidity();
      field.classList.toggle("invalid", !ok);
      if (!ok) valid = false;
    });
    if (!valid) {
      note.textContent = "Please fill in your name, a valid email and your message.";
      note.classList.add("error");
      return;
    }
    const data = new FormData(form);
    const subject = `New enquiry from ${data.get("name")}`;
    const body =
      `Name: ${data.get("name")}\n` +
      `Email: ${data.get("email")}\n` +
      `Service: ${data.get("service")}\n` +
      `Website: ${data.get("website") || "Not provided"}\n\n` +
      `${data.get("message")}`;
    window.location.href =
      `mailto:contact@aforarif.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    note.textContent = "Your email app should open now. Thanks for reaching out!";
    note.classList.remove("error");
  });
});
