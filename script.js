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
      `Website: ${data.get("website") || "Not provided"}\n\n` +
      `${data.get("message")}`;
    window.location.href =
      `mailto:contact@aforarif.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    note.textContent = "Your email app should open now. Thanks for reaching out!";
    note.classList.remove("error");
  });
});
