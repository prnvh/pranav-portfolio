const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasObserver = "IntersectionObserver" in window;

/* Nav highlight */

const navLinks = [...document.querySelectorAll(".header nav a")];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if (hasObserver) {
  const navObserver = new IntersectionObserver(
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

  sections.forEach((section) => navObserver.observe(section));
}

/* Reveal on scroll */

const revealables = document.querySelectorAll("[data-reveal]");

if (hasObserver && !reduceMotion) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );

  revealables.forEach((el) => revealObserver.observe(el));
} else {
  revealables.forEach((el) => el.classList.add("is-visible"));
}

/* Field strip: duplicate the items so the marquee loops seamlessly */

const track = document.querySelector(".field-strip__track");
if (track) {
  [...track.children].forEach((item) => {
    const clone = item.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
  });
}

/* Galaxy figure: drag to wipe between the optical sky and the radio emission */

const sky = document.querySelector("[data-sky]");
if (sky) {
  const range = sky.querySelector(".sky__range");
  const info = sky.querySelector(".sky__info");
  const views = [...sky.querySelectorAll(".sky__view")];
  const tabs = [...sky.querySelectorAll("[data-show]")];
  let sweep = 0;

  const setSplit = (value) => {
    sky.style.setProperty("--split", `${value}%`);
    range.value = value;
  };

  range.addEventListener("input", () => {
    cancelAnimationFrame(sweep);
    setSplit(Number(range.value));
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      views.forEach((view) => {
        const active = view.dataset.view === tab.dataset.show;
        view.classList.toggle("is-active", active);
        if (active) info.innerHTML = view.dataset.info;
      });
      tabs.forEach((other) => other.setAttribute("aria-pressed", String(other === tab)));
    });
  });

  if (hasObserver && !reduceMotion) {
    setSplit(100);
    const intro = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      intro.disconnect();
      const start = performance.now();
      const step = (now) => {
        const t = Math.min((now - start) / 1800, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setSplit(100 - eased * 62);
        if (t < 1) sweep = requestAnimationFrame(step);
      };
      sweep = requestAnimationFrame(step);
    }, { threshold: 0.5 });
    intro.observe(sky);
  }
}

/* Research: the section pins while scrolling pulls each file up in turn */

const research = document.querySelector(".research");
if (research) {
  const stage = research.querySelector(".research__stage");
  const files = [...research.querySelectorAll(".file")];
  const dossiers = [...research.querySelectorAll(".dossier")];
  const tabs = [...research.querySelectorAll("[data-goto]")];
  const counters = [...document.querySelectorAll(".js-file-count")];
  const count = files.length;
  const pinned = window.matchMedia("(min-width: 861px)");
  let current = -1;
  let queued = false;

  const headerHeight = () => document.querySelector(".header")?.offsetHeight || 0;
  const travel = () => research.offsetHeight - stage.offsetHeight;

  const show = (index) => {
    if (index === current) return;
    current = index;
    const toggle = (el, i) => el.classList.toggle("is-active", i === index);
    files.forEach(toggle);
    dossiers.forEach(toggle);
    tabs.forEach((tab) => {
      const active = Number(tab.dataset.goto) === index;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-pressed", String(active));
    });
    counters.forEach((el) => { el.textContent = String(index + 1).padStart(2, "0"); });
  };

  const update = () => {
    queued = false;
    if (!pinned.matches) {
      research.style.removeProperty("--p");
      return;
    }
    const distance = travel();
    const progress = distance > 0
      ? Math.min(Math.max((headerHeight() - research.getBoundingClientRect().top) / distance, 0), 1)
      : 0;
    research.style.setProperty("--p", progress.toFixed(4));
    show(Math.min(count - 1, Math.floor(progress * count)));
  };

  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const index = Number(tab.dataset.goto);
      const top = window.scrollY + research.getBoundingClientRect().top - headerHeight();
      window.scrollTo({
        top: top + travel() * (index + 0.5) / count,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });
  });

  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  show(0);
  update();
}

/* Landing: an ordered-dither render of Hercules A that zooms and dissolves on scroll */

const landing = document.querySelector(".landing");
const header = document.querySelector(".header");

const darkSections = [...document.querySelectorAll('[data-header="dark"]')];

const syncHeader = () => {
  if (!header) return;
  const line = header.offsetHeight / 2;
  header.classList.toggle("is-dark", darkSections.some((section) => {
    const rect = section.getBoundingClientRect();
    return rect.top <= line && rect.bottom > line;
  }));
};

window.addEventListener("scroll", syncHeader, { passive: true });
window.addEventListener("resize", syncHeader);
syncHeader();

if (landing) {
  const stage = landing.querySelector(".landing__stage");
  const canvas = landing.querySelector(".landing__canvas");
  const ctx = canvas.getContext("2d");
  const sample = document.createElement("canvas");
  const sctx = sample.getContext("2d", { willReadFrequently: true });
  const img = new Image();

  const bayer = [
    0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26,
    12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
    3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
    15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
  ].map((v) => (v + 0.5) / 64);

  const night = [20, 19, 17];
  const paper = [242, 238, 230];
  const vermilion = [214, 84, 44];
  const cell = 3;

  let cols = 0;
  let rows = 0;
  let lum = null;
  let lobe = null;
  let out = null;
  let sampledZoom = -1;
  let ready = false;
  let progress = 0;
  let reveal = reduceMotion ? 1 : 0;
  let time = 0;
  let last = 0;
  let frame = 0;
  let visible = true;
  let lastPointer = -Infinity;
  const beam = { x: 0.5, y: 0.45, tx: 0.5, ty: 0.45 };

  const smooth = (a, b, v) => {
    const t = Math.min(Math.max((v - a) / (b - a), 0), 1);
    return t * t * (3 - 2 * t);
  };

  const resize = () => {
    cols = Math.max(1, Math.ceil(stage.clientWidth / cell));
    rows = Math.max(1, Math.ceil(stage.clientHeight / cell));
    canvas.width = sample.width = cols;
    canvas.height = sample.height = rows;
    out = ctx.createImageData(cols, rows);
    lum = new Float32Array(cols * rows);
    lobe = new Uint8Array(cols * rows);
    sampledZoom = -1;
  };

  const resample = (zoom) => {
    const portrait = rows > cols * 1.15;
    const iw = portrait ? img.height : img.width;
    const ih = portrait ? img.width : img.height;
    const scale = Math.max(cols / iw, rows / ih) * zoom * (portrait ? 1 : 0.94);
    const focus = portrait ? [0.5, 0.4] : [0.6 - progress * 0.1, 0.4 + progress * 0.1];
    sctx.fillStyle = "#000";
    sctx.fillRect(0, 0, cols, rows);
    sctx.save();
    sctx.translate(cols * focus[0], rows * focus[1]);
    if (portrait) sctx.rotate(-Math.PI / 2);
    sctx.drawImage(img, (-img.width * scale) / 2, (-img.height * scale) / 2, img.width * scale, img.height * scale);
    sctx.restore();

    const d = sctx.getImageData(0, 0, cols, rows).data;
    for (let i = 0, j = 0; i < lum.length; i++, j += 4) {
      const r = d[j];
      const g = d[j + 1];
      const l = (0.2126 * r + 0.7152 * g + 0.0722 * d[j + 2]) / 255;
      lum[i] = Math.max(0, (l - 0.06) / 0.94) ** 0.9;
      lobe[i] = r > 80 && (r - g) / r > 0.2 ? 1 : 0;
    }
    sampledZoom = zoom;
  };

  const draw = () => {
    if (!ready) return;
    const zoom = 1 + progress * 0.6;
    if (Math.abs(zoom - sampledZoom) > 0.002) resample(zoom);

    const intro = 1 - (1 - reveal) ** 3;
    const gain = (0.88 + Math.sin(time * 0.6) * 0.04) * intro * (1 - 0.4 * smooth(0.02, 0.2, progress));
    const tone = 1 - 0.68 * smooth(0.02, 0.2, progress) - 0.24 * smooth(0.5, 0.9, progress);
    const shade = (c) => c.map((v, k) => Math.round(night[k] + (v - night[k]) * tone));
    const light = shade(paper);
    const lobeLight = shade(vermilion);
    const bx = beam.x * cols;
    const by = beam.y * rows;
    const spread = (Math.min(cols, rows) * 0.18) ** 2;
    const data = out.data;

    for (let y = 0, i = 0; y < rows; y++) {
      const row = (y & 7) * 8;
      const dy = (y - by) * (y - by);
      for (let x = 0; x < cols; x++, i++) {
        const dx = x - bx;
        const d2 = dx * dx + dy;
        const boost = d2 < spread * 6 ? 1 + 1.3 * Math.exp(-d2 / spread) : 1;
        const lit = lum[i] * gain * boost > bayer[row + (x & 7)];
        const c = lit ? (lobe[i] && lum[i] < 0.9 ? lobeLight : light) : night;
        const j = i * 4;
        data[j] = c[0];
        data[j + 1] = c[1];
        data[j + 2] = c[2];
        data[j + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
  };

  const tick = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    time += dt;
    reveal = Math.min(1, reveal + dt / 1.8);
    if (now - lastPointer > 2500) {
      beam.tx = 0.5 + Math.cos(time * 0.23) * 0.3;
      beam.ty = 0.46 + Math.sin(time * 0.31) * 0.22;
    }
    const ease = Math.min(1, dt * 4);
    beam.x += (beam.tx - beam.x) * ease;
    beam.y += (beam.ty - beam.y) * ease;
    draw();
    frame = visible ? requestAnimationFrame(tick) : 0;
  };

  const start = () => {
    if (reduceMotion || frame || !ready) return;
    last = 0;
    frame = requestAnimationFrame(tick);
  };

  const onScroll = () => {
    const rect = landing.getBoundingClientRect();
    const distance = landing.offsetHeight - stage.offsetHeight;
    progress = distance > 0 ? Math.min(Math.max(-rect.top / distance, 0), 1) : 0;
    landing.style.setProperty("--p", progress.toFixed(4));
    if (reduceMotion) draw();
  };

  stage.addEventListener("pointermove", (event) => {
    const rect = stage.getBoundingClientRect();
    beam.tx = (event.clientX - rect.left) / rect.width;
    beam.ty = (event.clientY - rect.top) / rect.height;
    lastPointer = performance.now();
  });

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    resize();
    onScroll();
    draw();
  });

  if (hasObserver) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    }).observe(stage);
  }

  onScroll();

  if (window.HERCULES_A) {
    img.onload = () => {
      ready = true;
      resize();
      draw();
      start();
    };
    img.src = window.HERCULES_A;
  }
}

