// A small original two-page demo site with the usual "AI look" (purple gradient, emoji cards),
// used by the "Try an example" button. Kept in JS so it also works in the offline single-file build.

const SHARED_STYLE = `
  :root { --brand: #7c3aed; --brand-2: #db2777; --ink: #1f2937; --muted: #6b7280; --paper: #faf5ff; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Poppins', sans-serif; color: #1f2937; background: #faf5ff; }
  nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 48px; }
  nav a { color: #1f2937; text-decoration: none; margin-left: 24px; font-weight: 500; }
  .logo { font-weight: 800; font-size: 22px; color: #7c3aed; }
  .hero { text-align: center; padding: 96px 24px; background: linear-gradient(135deg, #7c3aed, #db2777); color: #ffffff; }
  .hero h1 { font-size: 56px; margin: 0 0 16px; }
  .hero p { font-size: 20px; opacity: 0.9; max-width: 640px; margin: 0 auto 32px; }
  .btn { display: inline-block; background: #ffffff; color: #7c3aed; padding: 14px 28px; border-radius: 999px; font-weight: 700; text-decoration: none; }
  .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; padding: 72px 48px; }
  .card { background: #ffffff; border-radius: 16px; padding: 28px; box-shadow: 0 10px 30px rgba(124, 58, 237, 0.12); }
  .card h3 { margin: 12px 0 8px; }
  .card p, .muted { color: #6b7280; }
  .tabs { text-align: center; padding: 24px 48px 80px; }
  .tab-buttons button { border: 1px solid #7c3aed; background: #ffffff; color: #7c3aed; padding: 10px 20px; border-radius: 999px; margin: 0 6px; cursor: pointer; }
  .tab-panel { display: none; margin-top: 24px; }
  .tab-panel.active { display: block; }
  .price { font-size: 44px; font-weight: 800; color: #7c3aed; }
  footer { text-align: center; padding: 32px; color: #6b7280; }
`;

const FONT_LINK = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700;800&display=swap">';

const nav = `<nav><span class="logo">✦ Nimbus</span><div><a href="index.html">Home</a><a href="about.html">About</a><a href="#pricing">Pricing</a></div></nav>`;

const INDEX = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nimbus: Your AI-powered productivity companion</title>${FONT_LINK}<style>${SHARED_STYLE}</style></head>
<body>
${nav}
<header class="hero">
  <h1>Supercharge your workflow with AI ✨</h1>
  <p>Nimbus is the all-in-one, AI-powered platform that helps teams unlock their full potential and achieve more.</p>
  <a class="btn" href="#pricing">Get started for free 🚀</a>
</header>
<section class="features" id="features">
  <div class="card"><div>⚡</div><h3>Lightning fast</h3><p>Seamlessly streamline your tasks with cutting-edge automation.</p></div>
  <div class="card"><div>🔒</div><h3>Secure by design</h3><p>Enterprise-grade security that scales with your ambitions.</p></div>
  <div class="card"><div>🤝</div><h3>Built for teams</h3><p>Collaborate effortlessly and elevate every project to the next level.</p></div>
</section>
<section class="tabs" id="pricing">
  <h2>Simple, transparent pricing</h2>
  <div class="tab-buttons"><button data-tab="monthly">Monthly</button><button data-tab="yearly">Yearly</button></div>
  <div class="tab-panel active" id="monthly"><p class="price">$19/mo</p><p class="muted">Billed monthly. Cancel anytime.</p></div>
  <div class="tab-panel" id="yearly"><p class="price">$190/yr</p><p class="muted">Two months free when you pay yearly.</p></div>
</section>
<footer>© 2026 Nimbus Labs. Made with 💜 and AI.</footer>
<script>
document.querySelectorAll('[data-tab]').forEach(function (b) {
  b.addEventListener('click', function () {
    document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.toggle('active', p.id === b.dataset.tab); });
  });
});
<\/script>
</body></html>`;

const ABOUT = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>About Nimbus</title>${FONT_LINK}<style>${SHARED_STYLE}</style></head>
<body>
${nav}
<header class="hero">
  <h1>About us 💡</h1>
  <p>We are a passionate team on a mission to revolutionize the way the world works.</p>
</header>
<section class="features">
  <div class="card"><h3>Our story</h3><p>Founded in 2026, Nimbus was born from a simple idea: work should feel effortless.</p></div>
  <div class="card"><h3>Our values</h3><p>Innovation, integrity and impact guide everything we do.</p></div>
  <div class="card"><h3>Join us</h3><p>We are always looking for talented people to join our journey.</p></div>
</section>
<footer>© 2026 Nimbus Labs. Made with 💜 and AI.</footer>
</body></html>`;

export const SAMPLE_PAGES = Object.freeze([
  Object.freeze({ name: 'index.html', html: INDEX }),
  Object.freeze({ name: 'about.html', html: ABOUT }),
]);
