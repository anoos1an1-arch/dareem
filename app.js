import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const linksEl = document.querySelector("#links");

function safeUrl(raw) {
  try {
    const url = new URL(raw);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function render(links) {
  linksEl.replaceChildren();

  if (!links.length) {
    const empty = document.createElement("div");
    empty.className = "empty glass";
    empty.textContent = "لا توجد روابط مضافة حاليًا.";
    linksEl.append(empty);
    return;
  }

  for (const item of links) {
    const url = safeUrl(item.url);
    if (!url) continue;

    const card = document.createElement("a");
    card.className = "link-card glass";
    card.href = url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.setAttribute("aria-label", `فتح ${item.title}`);

    const icon = document.createElement("span");
    icon.className = "link-icon";
    icon.textContent = item.icon || "↗";

    const text = document.createElement("span");
    text.className = "link-copy";

    const title = document.createElement("strong");
    title.textContent = item.title;

    const dhikr = document.createElement("small");
    dhikr.textContent = "اذكر الله";

    text.append(title, dhikr);
    card.append(icon, text);

    const arrow = document.createElement("span");
    arrow.className = "link-arrow";
    arrow.textContent = "←";
    card.append(arrow);

    linksEl.append(card);
  }
}

async function loadLinks() {
  const { data, error } = await supabase
    .from("links")
    .select("id,title,url,icon,sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    linksEl.textContent = "تعذر تحميل الروابط.";
    console.error(error);
    return;
  }
  render(data ?? []);
}

loadLinks();

// خلفية 3D خفيفة: نقاط مضيئة تتحرك بعمق دون مكتبات ثقيلة.
const canvas = document.querySelector("#scene");
const ctx = canvas.getContext("2d");
const particles = [];
const count = 90;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  canvas.style.width = innerWidth + "px";
  canvas.style.height = innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resize();
addEventListener("resize", resize);

for (let i = 0; i < count; i++) {
  particles.push({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    z: Math.random() * 1 + 0.2,
    r: Math.random() * 1.8 + 0.3,
    vx: (Math.random() - 0.5) * 0.12,
    vy: (Math.random() - 0.5) * 0.08
  });
}

function frame() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (const p of particles) {
    p.x += p.vx / p.z;
    p.y += p.vy / p.z;
    if (p.x < -10) p.x = innerWidth + 10;
    if (p.x > innerWidth + 10) p.x = -10;
    if (p.y < -10) p.y = innerHeight + 10;
    if (p.y > innerHeight + 10) p.y = -10;

    const alpha = 0.12 + (1 - p.z) * 0.28;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r / p.z, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(202, 211, 255, ${alpha})`;
    ctx.fill();
  }
  requestAnimationFrame(frame);
}
frame();
