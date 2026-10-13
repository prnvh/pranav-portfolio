const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

const navLinks = [...document.querySelectorAll(".nav a")];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      navLinks.forEach((link) => {
        const isCurrent = link.getAttribute("href") === `#${visible.target.id}`;
        if (isCurrent) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    },
    { rootMargin: "-15% 0px -70% 0px", threshold: [0, 0.2, 0.5] }
  );

  sections.forEach((section) => observer.observe(section));
}
