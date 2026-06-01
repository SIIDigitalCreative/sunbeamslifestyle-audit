"use client";
import { useEffect } from "react";

// ── API helpers ───────────────────────────────────────────────────────────────
const API_BASE = typeof window !== "undefined" ? window.location.origin : "";

function collectState() {
  const checks: Record<string, boolean> = {};
  const notes: Record<string, string> = {};
  const priorities: Record<string, string> = {};
  const auditor = (document.getElementById('auditor-field') as HTMLElement)?.innerText || '';
  const url     = (document.getElementById('url-field')    as HTMLElement)?.innerText || '';
  document.querySelectorAll<HTMLInputElement>('.item-check').forEach((c, i) => {
    checks[`item_${i}`] = c.checked;
  });
  document.querySelectorAll<HTMLTextAreaElement>('.notes-area').forEach((t, i) => {
    notes[`note_${i}`] = t.value;
  });
  document.querySelectorAll<HTMLSelectElement>('.item-priority').forEach((s, i) => {
    priorities[`priority_${i}`] = s.value;
  });
  return { checks, notes, priorities, auditor, url };
}

function applyState(data: { checks?: Record<string,boolean>; notes?: Record<string,string>; priorities?: Record<string,string>; auditor?: string; url?: string }) {
  const { checks = {}, notes = {}, priorities = {}, auditor, url } = data;
  document.querySelectorAll<HTMLInputElement>('.item-check').forEach((c, i) => {
    c.checked = !!checks[`item_${i}`];
    const itemText = c.parentElement?.querySelector('.item-text');
    if (itemText) itemText.classList.toggle('checked-text', c.checked);
  });
  document.querySelectorAll<HTMLTextAreaElement>('.notes-area').forEach((t, i) => {
    if (notes[`note_${i}`]) {
      t.value = notes[`note_${i}`];
      t.classList.add('visible');
      const btn = t.previousElementSibling as HTMLButtonElement;
      if (btn) btn.textContent = '− Hide';
    }
  });
  document.querySelectorAll<HTMLSelectElement>('.item-priority').forEach((s, i) => {
    const saved = priorities[`priority_${i}`];
    if (saved) {
      s.value = saved;
      // Update the color class
      s.className = s.className.replace(/tag-\w+/g, '');
      const info = PRIORITY_OPTIONS.find(o => o.value === saved);
      if (info) s.classList.add(info.cls);
    }
  });
  if (auditor && auditor !== 'Click to add name') {
    const el = document.getElementById('auditor-field');
    if (el) el.innerText = auditor;
  }
  if (url && url !== 'Click to add URL') {
    const el = document.getElementById('url-field');
    if (el) el.innerText = url;
  }
}

async function loadFromRedis() {
  try {
    const r = await fetch(`${API_BASE}/api/progress`);
    if (!r.ok) throw new Error("api error");
    const d = await r.json();
    if (d.data && Object.keys(d.data).length > 0) {
      applyState(d.data);
      updateAll();
    }
  } catch {
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem("sunbeams-shopify-audit");
      if (raw) { applyState(JSON.parse(raw)); updateAll(); }
    } catch {}
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function saveState() {
  const state = collectState();
  // Always save locally as backup
  try { localStorage.setItem("sunbeams-shopify-audit", JSON.stringify(state)); } catch {}
  // Debounced save to Redis
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    setSyncBadge("saving");
    try {
      const r = await fetch(`${API_BASE}/api/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      setSyncBadge(r.ok ? "saved" : "error");
    } catch {
      setSyncBadge("error");
    }
  }, 800);
}

function setSyncBadge(status: "saving" | "saved" | "error") {
  const el = document.getElementById('sync-badge');
  if (!el) return;
  if (status === "saving") { el.textContent = "Syncing…"; el.style.color = "#9a8a84"; }
  if (status === "saved")  { el.textContent = "✓ Saved";  el.style.color = "#2d7a4f"; setTimeout(() => { el.textContent = ""; }, 2500); }
  if (status === "error")  { el.textContent = "Sync failed"; el.style.color = "#CB0033"; }
}

export default function Audit() {
  useEffect(() => {
    // Set today's date
    const dateEl = document.getElementById('date-field');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'});

    // Load from Redis (falls back to localStorage)
    loadFromRedis();

    // Auto-save auditor and URL fields on edit
    const auditorEl = document.getElementById('auditor-field');
    const urlEl = document.getElementById('url-field');
    auditorEl?.addEventListener('input', saveState);
    urlEl?.addEventListener('input', saveState);

    // Poll for updates every 30 seconds
    const poll = setInterval(loadFromRedis, 30000);

    return () => {
      clearInterval(poll);
      auditorEl?.removeEventListener('input', saveState);
      urlEl?.removeEventListener('input', saveState);
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        :root {
          --crimson: #CB0033;
          --crimson-light: #f5e6ea;
          --crimson-dark: #9a0026;
          --warm-brown: #A47860;
          --sand: #D6D2C4;
          --cloud: #F4F0EC;
          --ink: #1a1210;
          --ink-muted: #5a4a44;
          --ink-faint: #9a8a84;
          --surface: #ffffff;
          --border: #e8e2dc;
          --pass: #2d7a4f;
          --pass-bg: #edf7f2;
          --warn: #b85c00;
          --warn-bg: #fff4e6;
          --fail: #CB0033;
          --fail-bg: #fce6ec;
          --na: #6a6060;
          --na-bg: #f2efed;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--cloud);
          color: var(--ink);
          font-size: 14px;
          line-height: 1.6;
          min-height: 100vh;
        }

        .header {
          background: var(--ink);
          padding: 40px 48px 32px;
          position: relative;
          overflow: hidden;
        }
        .header::before {
          content: '';
          position: absolute;
          top: -60px; right: -60px;
          width: 300px; height: 300px;
          border-radius: 50%;
          background: var(--crimson);
          opacity: 0.08;
        }
        .header-brand {
          font-family: 'Cormorant Garamond', serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--warm-brown);
          margin-bottom: 8px;
        }
        .header-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 42px;
          font-weight: 400;
          color: #f4f0ec;
          line-height: 1.1;
          margin-bottom: 6px;
        }
        .header-title span { color: var(--crimson); font-style: italic; }
        .header-sub {
          color: var(--ink-faint);
          font-size: 13px;
          font-weight: 300;
          letter-spacing: 0.02em;
          margin-bottom: 20px;
        }
        .header-meta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .meta-chip {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 6px 14px;
          border-radius: 4px;
          font-size: 12px;
          color: var(--ink-faint);
        }
        .meta-chip strong {
          color: #f4f0ec;
          font-weight: 500;
        }

        .dashboard {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          padding: 14px 48px;
          display: flex;
          align-items: center;
          gap: 20px;
          box-shadow: 0 2px 12px rgba(26,18,16,0.08);
        }
        .score-ring { position: relative; flex-shrink: 0; }
        .score-text {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          text-align: center;
          line-height: 1.1;
        }
        .score-text span:first-child {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: var(--ink);
        }
        .score-label {
          font-size: 8px;
          letter-spacing: 0.15em;
          color: var(--ink-faint);
          text-transform: uppercase;
        }
        .score-label-main { flex: 1; min-width: 0; }
        .score-label-main h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
          font-weight: 500;
          color: var(--ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .score-label-main p {
          font-size: 12px;
          color: var(--ink-faint);
          margin-top: 1px;
        }
        .stat-pills { display: flex; gap: 8px; flex-shrink: 0; }
        .stat-pill {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 6px 12px;
          border-radius: 6px;
          min-width: 52px;
        }
        .stat-pill .num {
          font-size: 18px;
          font-weight: 600;
          line-height: 1;
        }
        .stat-pill .lbl {
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .pill-pass { background: var(--pass-bg); color: var(--pass); }
        .pill-fail { background: var(--fail-bg); color: var(--fail); }
        .pill-na   { background: var(--na-bg);   color: var(--na); }
        .pill-total{ background: #f0ece8; color: var(--ink-muted); }

        .export-btn {
          padding: 8px 18px;
          background: var(--crimson);
          color: #fff;
          border: none;
          border-radius: 4px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.06em;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.18s;
        }
        .export-btn:hover { background: var(--crimson-dark); }

        .main {
          max-width: 900px;
          margin: 0 auto;
          padding: 32px 24px 80px;
        }

        .section {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          margin-bottom: 16px;
          overflow: hidden;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          cursor: pointer;
          user-select: none;
          transition: background 0.15s;
        }
        .section-header:hover { background: #faf8f6; }
        .section-num {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: var(--crimson);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .section-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
          font-weight: 500;
          color: var(--ink);
          flex: 1;
        }
        .section-badge {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 3px 9px;
          border-radius: 3px;
          flex-shrink: 0;
        }
        .badge-critical { background: var(--fail-bg); color: var(--fail); }
        .badge-high     { background: var(--warn-bg); color: var(--warn); }
        .badge-medium   { background: #f0ece8; color: var(--ink-muted); }

        .section-progress {
          height: 3px;
          background: var(--border);
        }
        .section-progress-bar {
          height: 3px;
          background: var(--crimson);
          transition: width 0.4s ease;
          width: 0%;
        }

        .section-body { padding: 0 20px 20px; }
        .section-body.collapsed { display: none; }

        .subsection { margin-top: 20px; }
        .subsection-title {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--warm-brown);
          margin-bottom: 10px;
          padding-bottom: 6px;
          border-bottom: 1px solid var(--border);
        }

        .item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 10px;
          border-radius: 6px;
          margin-bottom: 4px;
          transition: background 0.15s;
          cursor: default;
        }
        .item:hover { background: #faf8f6; }

        .item-check {
          width: 16px; height: 16px;
          margin-top: 2px;
          cursor: pointer;
          accent-color: var(--crimson);
          flex-shrink: 0;
        }
        .item-body { flex: 1; min-width: 0; }
        .item-text {
          font-size: 13px;
          color: var(--ink);
          line-height: 1.5;
        }
        .item-text.checked-text {
          text-decoration: line-through;
          color: var(--ink-faint);
        }
        .item-note {
          font-size: 11px;
          color: var(--ink-faint);
          margin-top: 3px;
          line-height: 1.5;
        }
        .item-tag {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 3px;
          flex-shrink: 0;
          margin-top: 2px;
          white-space: nowrap;
        }
        .tag-now     { background: var(--fail-bg);  color: var(--fail); }
        .tag-week    { background: var(--warn-bg);  color: var(--warn); }
        .tag-month   { background: #eef4ff; color: #3a5fc8; }
        .tag-ongoing { background: var(--pass-bg);  color: var(--pass); }

        select.item-tag {
          border: none;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          appearance: none;
          -webkit-appearance: none;
          padding-right: 14px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='currentColor' opacity='0.5'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 4px center;
          outline: none;
          transition: opacity 0.18s;
        }
        select.item-tag:hover { opacity: 0.8; }

        .notes-toggle {
          font-size: 11px;
          color: var(--warm-brown);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          margin-top: 5px;
          font-family: 'DM Sans', sans-serif;
          transition: color 0.15s;
        }
        .notes-toggle:hover { color: var(--crimson); }

        .notes-area {
          display: none;
          width: 100%;
          margin-top: 6px;
          padding: 8px 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          border: 1px solid var(--border);
          border-radius: 4px;
          background: var(--cloud);
          color: var(--ink);
          resize: vertical;
          min-height: 52px;
          outline: none;
          transition: border-color 0.2s;
        }
        .notes-area:focus { border-color: var(--crimson); }
        .notes-area.visible { display: block; }

        .legend {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 28px;
          padding: 14px 20px;
          background: var(--surface);
          border-radius: 8px;
          border: 0.5px solid var(--border);
        }
        .legend-title {
          font-size: 11px;
          font-weight: 500;
          color: var(--ink-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-right: 8px;
          align-self: center;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--ink-muted);
        }

        @media (max-width: 640px) {
          .header { padding: 28px 20px 24px; }
          .header-title { font-size: 30px; }
          .dashboard { padding: 12px 16px; gap: 12px; }
          .stat-pills { display: none; }
          .main { padding: 20px 12px 60px; }
        }

        @media print {
          .dashboard { position: static; box-shadow: none; }
          .export-btn { display: none; }
          .item:hover { background: none; }
          .notes-area.visible { display: block; }
        }
      `}</style>

      <div className="header">
        <div className="header-brand">Sunbeams Lifestyle · Internal Operations</div>
        <div className="header-title">Shopify Store <span>Audit</span></div>
        <div className="header-sub">Comprehensive review checklist — complete before any campaign spend</div>
        <div className="header-meta">
          <div className="meta-chip">Auditor: <strong id="auditor-field" contentEditable="true" suppressContentEditableWarning style={{outline:'none',minWidth:80}}>Click to add name</strong></div>
          <div className="meta-chip">Date: <strong id="date-field"></strong></div>
          <div className="meta-chip">Store URL: <strong id="url-field" contentEditable="true" suppressContentEditableWarning style={{outline:'none',minWidth:140}}>Click to add URL</strong></div>
        </div>
      </div>

      <div className="dashboard">
        <div className="score-ring">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="30" fill="none" stroke="#e8e2dc" strokeWidth="5"/>
            <circle id="ring-arc" cx="36" cy="36" r="30" fill="none" stroke="#CB0033" strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray="188.5" strokeDashoffset="188.5"
                    style={{transition:'stroke-dashoffset 0.5s ease'}}/>
          </svg>
          <div className="score-text">
            <span id="pct-display">0%</span>
            <span className="score-label">DONE</span>
          </div>
        </div>
        <div className="score-label-main">
          <h2 id="score-heading">Not started</h2>
          <p id="score-sub">Check items as you review each section</p>
        </div>
        <div className="stat-pills">
          <div className="stat-pill pill-pass"><span className="num" id="cnt-pass">0</span><span className="lbl">Pass</span></div>
          <div className="stat-pill pill-fail"><span className="num" id="cnt-fail">0</span><span className="lbl">Fix</span></div>
          <div className="stat-pill pill-na"><span className="num" id="cnt-na">0</span><span className="lbl">N/A</span></div>
          <div className="stat-pill pill-total"><span className="num" id="cnt-total">0</span><span className="lbl">Total</span></div>
        </div>
        <button className="export-btn" onClick={() => exportCSV()}>Export CSV</button>
        <button className="export-btn" style={{background:'transparent',border:'1.5px solid #e8e2dc',color:'var(--ink-muted)'}} onClick={() => {
          if(confirm('Reset all progress? This cannot be undone.')) {
            localStorage.removeItem("sunbeams-shopify-audit");
            fetch(`${API_BASE}/api/progress`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});
            window.location.reload();
          }
        }}>Reset</button>
        <span id="sync-badge" style={{fontSize:11,letterSpacing:'0.1em',minWidth:70,textAlign:'right'}}></span>
      </div>

      <div className="main">
        <div className="legend">
          <span className="legend-title">Priority:</span>
          <span className="legend-item"><span className="item-tag tag-now">Now</span> Fix today</span>
          <span className="legend-item"><span className="item-tag tag-week">This Week</span> Fix within 7 days</span>
          <span className="legend-item"><span className="item-tag tag-month">This Month</span> 30-day task</span>
          <span className="legend-item"><span className="item-tag tag-ongoing">Ongoing</span> Recurring review</span>
        </div>

        {/* SECTION 1 */}
        <div className="section" id="s1">
          <div className="section-header" onClick={() => toggleSection('s1')}>
            <div className="section-num">1</div>
            <div className="section-title">Store Health &amp; Performance</div>
            <span className="section-badge badge-critical">Critical</span>
            <span id="s1-pct" style={{fontSize:12,color:'var(--ink-faint)',marginLeft:8}}>0%</span>
          </div>
          <div className="section-progress"><div className="section-progress-bar" id="s1-bar"></div></div>
          <div className="section-body" id="s1-body">
            <div className="subsection">
              <div className="subsection-title">Page Speed</div>
              {item("Run PageSpeed Insights on homepage (mobile + desktop)","Mobile LCP must be under 2.5s. Score target: 70+ mobile, 90+ desktop.","now","e.g. Mobile score: 52, LCP: 4.1s — needs image compression")}
              {item("Run PageSpeed on top 3 product pages and collection pages","Product pages are high-traffic — slow load = direct revenue loss.","now","e.g. Product page LCP: 3.8s — hero image not compressed")}
              {item("Check Total Blocking Time (TBT) — must be under 200ms","TBT above 600ms indicates heavy JS — usually from unused apps.","now","")}
              {item("Audit all installed apps — remove any inactive or unused apps","Every app adds JS to the storefront even when inactive. Review quarterly.","now","e.g. Found 14 apps — 6 unused, removing saves ~400ms")}
              {item("Confirm all product images are compressed and served in WebP format","Shopify auto-converts to WebP, but source files must not exceed 1MB each.","week","")}
            </div>
            <div className="subsection">
              <div className="subsection-title">Technical Health</div>
              {item("Crawl store with Screaming Frog or Ahrefs — identify all 404 errors and broken links","Broken links hurt SEO and user trust. Redirect or fix all 404s.","week","")}
              {item("Check for redirect chains (A→B→C) — flatten to single redirects (A→C)","Each redirect adds ~200ms of latency per hop.","week","")}
              {item("Confirm SSL certificate is valid and all pages serve on HTTPS","","now","")}
              {item("Verify XML sitemap is submitted to Google Search Console","Shopify generates sitemap.xml automatically — confirm it's indexed.","week","")}
              {item("Check robots.txt — confirm key collection and product pages are crawlable","","week","")}
              {item("Verify canonical tags are correctly set on all product and collection pages","Duplicate URLs without canonicals cause SEO dilution.","week","")}
            </div>
          </div>
        </div>

        {/* SECTION 2 */}
        <div className="section" id="s2">
          <div className="section-header" onClick={() => toggleSection('s2')}>
            <div className="section-num">2</div>
            <div className="section-title">Brand &amp; Visual Consistency</div>
            <span className="section-badge badge-high">High</span>
            <span id="s2-pct" style={{fontSize:12,color:'var(--ink-faint)',marginLeft:8}}>0%</span>
          </div>
          <div className="section-progress"><div className="section-progress-bar" id="s2-bar"></div></div>
          <div className="section-body" id="s2-body">
            <div className="subsection">
              <div className="subsection-title">Visual Identity</div>
              {item("Brand colors (#CB0033, #A47860, #D6D2C4, #F4F0EC) applied consistently across all pages","Check header, footer, buttons, badges, and hover states.","now","")}
              {item("Typography consistent: Playfair Display for headings, DM Sans for body throughout","No rogue fonts from app widgets or third-party embeds.","week","")}
              {item("Logo correct on all pages — no stretched, pixelated, or outdated versions","Check desktop header, mobile header, favicon, and email templates.","now","")}
              {item("All sub-brand pages (Quencha, Crysalis, Primeo, Slique, Nest) use correct brand identity","Each sub-brand has its own color and typography treatment.","week","")}
              {item("No clashing UI from app-injected widgets (chat bubbles, review stars, popups)","Audit visual weight — remove or restyle any element that breaks brand.","week","")}
            </div>
            <div className="subsection">
              <div className="subsection-title">Image Standards</div>
              {item("All hero images are lifestyle photography — no white-background product shots in hero positions","White-bg images in lifestyle slots read as low-effort.","week","")}
              {item("Product images consistent: same angle, same white background, same padding, same aspect ratio","Inconsistency across a collection page looks unprofessional.","week","")}
              {item("No stock photos that look generic — all imagery feels ownable to Sunbeams Lifestyle","Run a visual audit of the homepage and top 5 collection pages.","month","")}
            </div>
          </div>
        </div>

        {/* SECTION 3 */}
        <div className="section" id="s3">
          <div className="section-header" onClick={() => toggleSection('s3')}>
            <div className="section-num">3</div>
            <div className="section-title">Product Pages</div>
            <span className="section-badge badge-critical">Critical</span>
            <span id="s3-pct" style={{fontSize:12,color:'var(--ink-faint)',marginLeft:8}}>0%</span>
          </div>
          <div className="section-progress"><div className="section-progress-bar" id="s3-bar"></div></div>
          <div className="section-body" id="s3-body">
            <div className="subsection">
              <div className="subsection-title">Copy & Content</div>
              {item("Every product has a title, description, key benefits (bullets), and care/usage info","No placeholder text or empty description fields.","now","")}
              {item("Product titles follow format: Brand + Product Name + Key Feature + Variant","e.g. Quencha 19oz Insulated Tumbler — Matte Black","now","")}
              {item("All prices correct and consistent with Lazada/Shopee pricing parity policy","Price discrepancies erode trust if customers cross-check.","now","")}
              {item("Variants (size, color) all populated — no broken variants showing as unavailable","Check every SKU, especially bundles and gift sets.","now","")}
              {item("At least 5 product images per SKU: hero, lifestyle, detail, dimension, in-use","Fewer than 4 images measurably reduces conversion.","week","")}
            </div>
            <div className="subsection">
              <div className="subsection-title">Trust & Conversion</div>
              {item("Reviews visible on all active products — minimum 3 reviews before running paid ads","Products with zero reviews should not receive paid traffic.","now","")}
              {item("Shipping info and delivery timeline clearly visible on product page (not hidden in FAQ)","Filipino shoppers abandon if shipping info is hard to find.","now","")}
              {item("Return policy clearly linked or visible near Add to Cart button","Reduces friction for first-time buyers.","week","")}
              {item("Warranty information present on applicable products (Quencha, Crysalis, Primeo)","","week","")}
              {item("Cross-sell / You may also like section functional and showing relevant products","Do not cross-sell products from a different sub-brand unless intentional.","month","")}
            </div>
          </div>
        </div>

        {/* SECTION 4 */}
        <div className="section" id="s4">
          <div className="section-header" onClick={() => toggleSection('s4')}>
            <div className="section-num">4</div>
            <div className="section-title">Checkout &amp; Conversion</div>
            <span className="section-badge badge-critical">Critical</span>
            <span id="s4-pct" style={{fontSize:12,color:'var(--ink-faint)',marginLeft:8}}>0%</span>
          </div>
          <div className="section-progress"><div className="section-progress-bar" id="s4-bar"></div></div>
          <div className="section-body" id="s4-body">
            <div className="subsection">
              <div className="subsection-title">Checkout Flow</div>
              {item("Complete a test purchase end-to-end — confirm all steps work on mobile","Do this on iOS and Android. Use a ₱1 test product.","now","e.g. Tested on iPhone 14 — payment processed, confirmation email received")}
              {item("Guest checkout enabled — do not force account creation","Forced registration is the #1 checkout abandonment cause.","now","")}
              {item("All payment methods working: GCash, Maya, credit card, COD (if applicable)","Test each one or verify via Shopify Payments dashboard.","now","")}
              {item("Shipping rates correct — no ₱0 shipping showing when it should be paid","Check flat rate, weight-based, and free shipping threshold.","now","")}
              {item("Order confirmation email sends immediately with correct order details","Check spam folder too — if it lands there, fix email sender reputation.","now","")}
            </div>
            <div className="subsection">
              <div className="subsection-title">Cart & Upsell</div>
              {item("Cart page shows product image, name, variant, quantity, and subtotal clearly","No truncated product names or missing images in cart.","week","")}
              {item("Free shipping progress bar visible in cart (e.g. 'Add ₱150 more for free shipping')","Increases AOV by 15–25% on average.","week","")}
              {item("Cart upsell or cross-sell configured — relevant add-on shown in cart or at checkout","Bundle offers or accessories, not random products.","month","")}
            </div>
          </div>
        </div>

        {/* SECTION 5 */}
        <div className="section" id="s5">
          <div className="section-header" onClick={() => toggleSection('s5')}>
            <div className="section-num">5</div>
            <div className="section-title">Email &amp; Automation (Klaviyo)</div>
            <span className="section-badge badge-high">High</span>
            <span id="s5-pct" style={{fontSize:12,color:'var(--ink-faint)',marginLeft:8}}>0%</span>
          </div>
          <div className="section-progress"><div className="section-progress-bar" id="s5-bar"></div></div>
          <div className="section-body" id="s5-body">
            <div className="subsection">
              <div className="subsection-title">Core Flows</div>
              {item("Welcome series active (3 emails minimum: welcome, brand story, first purchase offer)","Welcome flow generates 30–50% of total Klaviyo revenue for most brands.","now","")}
              {item("Abandoned cart flow active (3 emails: 1hr, 24hr, 72hr)","3-email sequence recovers 3–5x more revenue than a single email.","now","")}
              {item("Browse abandonment flow active for product page visitors","Captures intent before cart — often higher open rate than cart abandonment.","week","")}
              {item("Post-purchase flow active (thank you + review request at Day 7 + replenishment at Day 30)","Review request timing: 7 days for most products, 14 days for skincare.","week","")}
              {item("Win-back flow active for customers with no purchase in 90 days","Offer a discount or 'we miss you' message with a product spotlight.","month","")}
            </div>
            <div className="subsection">
              <div className="subsection-title">List Health</div>
              {item("Email list cleaned — suppressed all unengaged subscribers (no open in 180 days)","Sending to unengaged contacts tanks deliverability.","month","")}
              {item("Double opt-in configured for all new signup forms","Required for GDPR compliance and improves list quality.","week","")}
              {item("Unsubscribe rate below 0.3% per campaign — if higher, audit sending frequency","Above 0.5% triggers deliverability problems.","ongoing","")}
            </div>
          </div>
        </div>

        {/* SECTION 6 */}
        <div className="section" id="s6">
          <div className="section-header" onClick={() => toggleSection('s6')}>
            <div className="section-num">6</div>
            <div className="section-title">Analytics &amp; Tracking</div>
            <span className="section-badge badge-critical">Critical</span>
            <span id="s6-pct" style={{fontSize:12,color:'var(--ink-faint)',marginLeft:8}}>0%</span>
          </div>
          <div className="section-progress"><div className="section-progress-bar" id="s6-bar"></div></div>
          <div className="section-body" id="s6-body">
            <div className="subsection">
              <div className="subsection-title">Pixel & Conversion Tracking</div>
              {item("Meta Pixel firing on all pages — verified via Meta Pixel Helper Chrome extension","Check: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase events.","now","")}
              {item("TikTok Pixel active and Purchase event firing correctly","Use TikTok Pixel Helper to verify — critical for TikTok ad optimisation.","now","")}
              {item("Google Analytics 4 installed and Purchase event firing with correct revenue value","Verify in GA4 DebugView — revenue must not be ₱0 or undefined.","now","")}
              {item("Google Ads conversion tracking set up and recording purchases","Without this, Smart Bidding has no data to optimise.","now","")}
              {item("All pixels tested with a real purchase — confirm revenue value is correct in each platform","Pixel Helper tools do not verify revenue accuracy — only a live purchase does.","now","e.g. Tested ₱799.75 purchase — Meta shows ₱799.75 ✓, GA4 shows ₱799.75 ✓")}
            </div>
            <div className="subsection">
              <div className="subsection-title">Reporting</div>
              {item("Shopify Analytics: conversion rate, AOV, and sessions reviewed weekly","Baseline: PH e-commerce conversion rate 1.5–3%. Below 1% = CRO priority.","ongoing","")}
              {item("UTM parameters on all paid ad links — no untagged traffic in GA4","Every Meta, TikTok, and Google ad must have utm_source, utm_medium, utm_campaign.","now","")}
              {item("Search Console connected — impressions, clicks, and ranking keywords reviewed monthly","Identifies organic growth opportunities and indexing issues.","week","")}
            </div>
          </div>
        </div>

        {/* SECTION 7 */}
        <div className="section" id="s7">
          <div className="section-header" onClick={() => toggleSection('s7')}>
            <div className="section-num">7</div>
            <div className="section-title">SEO</div>
            <span className="section-badge badge-high">High</span>
            <span id="s7-pct" style={{fontSize:12,color:'var(--ink-faint)',marginLeft:8}}>0%</span>
          </div>
          <div className="section-progress"><div className="section-progress-bar" id="s7-bar"></div></div>
          <div className="section-body" id="s7-body">
            <div className="subsection">
              <div className="subsection-title">On-Page SEO</div>
              {item("Every product page has a unique meta title and meta description","Shopify defaults to product title — this is not enough. Customize all.","week","")}
              {item("Meta titles follow format: Primary Keyword | Brand Name — under 60 characters","e.g. Insulated Tumbler 550ml | Quencha by Sunbeams Lifestyle","week","")}
              {item("All product images have descriptive alt text (not 'image1.jpg' or blank)","Alt text is used by screen readers and Google Image Search.","week","")}
              {item("H1 tag on every product and collection page — matches primary keyword","Shopify often uses product title as H1 — verify it's correct and keyword-rich.","week","")}
              {item("Collection pages have descriptive copy (150+ words) above or below the product grid","Google needs text to understand what a collection page is about.","month","")}
            </div>
            <div className="subsection">
              <div className="subsection-title">Technical SEO</div>
              {item("No duplicate product URLs — confirm /products/ pages have canonical tags","Shopify can create duplicate URLs via collections — canonicals prevent penalties.","week","")}
              {item("Internal linking: collection pages link to related collections and top products","Distributes link equity and helps Google crawl the store.","month","")}
              {item("Schema markup (Product, Review, BreadcrumbList) implemented on product pages","Rich snippets improve CTR in search results by 20–30%.","month","")}
            </div>
          </div>
        </div>

        {/* SECTION 8 */}
        <div className="section" id="s8">
          <div className="section-header" onClick={() => toggleSection('s8')}>
            <div className="section-num">8</div>
            <div className="section-title">Inventory &amp; Operations</div>
            <span className="section-badge badge-high">High</span>
            <span id="s8-pct" style={{fontSize:12,color:'var(--ink-faint)',marginLeft:8}}>0%</span>
          </div>
          <div className="section-progress"><div className="section-progress-bar" id="s8-bar"></div></div>
          <div className="section-body" id="s8-body">
            <div className="subsection">
              <div className="subsection-title">Stock Management</div>
              {item("All active products have inventory tracking enabled in Shopify","Products without tracking show as always in stock — dangerous.","now","")}
              {item("Out-of-stock products show 'Notify me when available' button (not just grey/disabled)","Capturing demand for OOS products prevents permanent lost sales.","week","")}
              {item("Low-stock threshold alerts configured — notify team when SKU drops below 10 units","Prevents stockouts during campaign periods.","week","")}
              {item("No products marked Active with zero inventory (unless pre-order)","Active + zero stock = bad customer experience and wasted ad spend.","now","")}
            </div>
            <div className="subsection">
              <div className="subsection-title">Fulfilment</div>
              {item("Shipping zones and rates correct for all Philippine regions (Luzon, Visayas, Mindanao)","Different rates for Metro Manila vs provincial is standard — verify all zones.","now","")}
              {item("Order fulfilment SLA defined and communicated: same-day cut-off, processing time, carrier","Customers expect shipping within 1–2 business days after payment.","week","")}
              {item("Packaging materials stocked for at least 30 days of projected sales volume","Run out of packaging = fulfilment delay = negative reviews.","ongoing","")}
            </div>
          </div>
        </div>

        {/* SECTION 9 */}
        <div className="section" id="s9">
          <div className="section-header" onClick={() => toggleSection('s9')}>
            <div className="section-num">9</div>
            <div className="section-title">Homepage &amp; Navigation</div>
            <span className="section-badge badge-medium">Medium</span>
            <span id="s9-pct" style={{fontSize:12,color:'var(--ink-faint)',marginLeft:8}}>0%</span>
          </div>
          <div className="section-progress"><div className="section-progress-bar" id="s9-bar"></div></div>
          <div className="section-body" id="s9-body">
            <div className="subsection">
              <div className="subsection-title">Homepage Above the Fold</div>
              {item("Hero section: one clear headline, one CTA, lifestyle image — visible without scrolling on mobile","","now","")}
              {item("Value proposition communicated above the fold (what makes Sunbeams different)","","week","")}
              {item("Social proof on homepage: review count, press logos, or UGC section","","month","")}
            </div>
            <div className="subsection">
              <div className="subsection-title">Navigation</div>
              {item("Main navigation: max 6–7 items, no buried collections more than 2 clicks deep","","week","")}
              {item("Search bar functional and prominent on mobile","Shopify Predictive Search app recommended for better UX.","week","")}
              {item("Footer includes: contact, policies, social links, newsletter signup","","week","")}
              {item("Announcement bar with current offer or free shipping threshold (not left blank)","","now","")}
            </div>
          </div>
        </div>

        {/* SECTION 10 */}
        <div className="section" id="s10">
          <div className="section-header" onClick={() => toggleSection('s10')}>
            <div className="section-num">10</div>
            <div className="section-title">Loyalty &amp; Retention</div>
            <span className="section-badge badge-medium">Medium</span>
            <span id="s10-pct" style={{fontSize:12,color:'var(--ink-faint)',marginLeft:8}}>0%</span>
          </div>
          <div className="section-progress"><div className="section-progress-bar" id="s10-bar"></div></div>
          <div className="section-body" id="s10-body">
            <div className="subsection">
              <div className="subsection-title">Loyalty Programme</div>
              {item("Loyalty/rewards app installed (Smile.io, Yotpo, or BON Loyalty)","Loyalty mechanics must deliver perceived value immediately — points with no near-term redemption kill engagement.","month","")}
              {item("VIP customer segment defined in Klaviyo (top 10% by LTV) — receives early access and exclusive offers","","month","")}
              {item("Referral programme configured — customers can share a code to earn store credit","","month","")}
            </div>
            <div className="subsection">
              <div className="subsection-title">Recurring Audit Checks</div>
              {item("Monthly review of top 10 product pages: conversion rate, bounce rate, heatmap data","","ongoing","")}
              {item("Quarterly app stack audit — remove unused apps, check for duplicates","","ongoing","")}
              {item("Monthly Klaviyo flow performance review — open rate, click rate, revenue per recipient","Benchmark: welcome open rate 45%+, abandoned cart recovery 8%+.","ongoing","")}
              {item("One CRO experiment running at all times — test one variable per page per month","","ongoing","Current experiment: ____")}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
let itemIndex = 0;

const PRIORITY_OPTIONS = [
  { value: 'now',     label: 'Now',        cls: 'tag-now' },
  { value: 'week',    label: 'This Week',  cls: 'tag-week' },
  { value: 'month',   label: 'This Month', cls: 'tag-month' },
  { value: 'ongoing', label: 'Ongoing',    cls: 'tag-ongoing' },
];

function getPriorityInfo(p: string) {
  return PRIORITY_OPTIONS.find(o => o.value === p) || PRIORITY_OPTIONS[0];
}

function item(text: string, note: string, priority: string, placeholder: string) {
  const idx = itemIndex++;
  const info = getPriorityInfo(priority);
  return (
    <div className="item" key={idx}>
      <input type="checkbox" className="item-check" onChange={(e) => tick(e.target as HTMLInputElement)} />
      <div className="item-body">
        <div className="item-text">{text}</div>
        {note && <div className="item-note">{note}</div>}
        <button className="notes-toggle" onClick={(e) => toggleNote(e.target as HTMLButtonElement)}>+ Add finding</button>
        <textarea className="notes-area" placeholder={placeholder || ''}></textarea>
      </div>
      <select
        className={`item-tag item-priority ${info.cls}`}
        defaultValue={priority}
        onChange={(e) => changePriority(e.target as HTMLSelectElement)}
        title="Change priority"
      >
        {PRIORITY_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── JS Logic ────────────────────────────────────────────────────────────────
function tick(el: HTMLInputElement) {
  const itemText = el.parentElement?.querySelector('.item-text');
  if (itemText) itemText.classList.toggle('checked-text', el.checked);
  updateAll();
  saveState();
}

function updateAll() {
  const all = document.querySelectorAll('.item-check') as NodeListOf<HTMLInputElement>;
  let total = all.length, done = 0;
  all.forEach(c => { if (c.checked) done++; });
  const pct = total > 0 ? Math.round(done / total * 100) : 0;

  const pctEl = document.getElementById('pct-display');
  if (pctEl) pctEl.textContent = pct + '%';

  const arc = document.getElementById('ring-arc');
  if (arc) {
    arc.setAttribute('stroke-dashoffset', String(188.5 * (1 - pct / 100)));
    arc.setAttribute('stroke', pct < 40 ? '#CB0033' : pct < 70 ? '#b85c00' : '#2d7a4f');
  }

  const headings = ['Not started','Just getting started','Making progress','More than halfway','Almost there!','Audit complete ✓'];
  const idx = Math.floor(pct / 20);
  const sh = document.getElementById('score-heading');
  if (sh) sh.textContent = headings[Math.min(idx, 5)];
  const ss = document.getElementById('score-sub');
  if (ss) ss.textContent = done + ' of ' + total + ' items checked';

  const cntPass = document.getElementById('cnt-pass'); if (cntPass) cntPass.textContent = String(done);
  const cntFail = document.getElementById('cnt-fail'); if (cntFail) cntFail.textContent = String(total - done);
  const cntTotal = document.getElementById('cnt-total'); if (cntTotal) cntTotal.textContent = String(total);

  ['s1','s2','s3','s4','s5','s6','s7','s8','s9','s10'].forEach(sid => {
    const items = document.querySelectorAll('#' + sid + ' .item-check') as NodeListOf<HTMLInputElement>;
    let s = 0, sd = 0;
    items.forEach(c => { s++; if (c.checked) sd++; });
    const sp = s > 0 ? Math.round(sd / s * 100) : 0;
    const bar = document.getElementById(sid + '-bar');
    if (bar) bar.style.width = sp + '%';
    const pctEl2 = document.getElementById(sid + '-pct');
    if (pctEl2) pctEl2.textContent = sp + '%';
  });
}

function toggleSection(sid: string) {
  const body = document.getElementById(sid + '-body');
  if (body) body.classList.toggle('collapsed');
}

function toggleNote(btn: HTMLButtonElement) {
  const ta = btn.nextElementSibling as HTMLTextAreaElement;
  if (ta) {
    ta.classList.toggle('visible');
    btn.textContent = ta.classList.contains('visible') ? '− Hide' : '+ Add finding';
    // Save when typing in notes
    ta.addEventListener('input', saveState);
  }
}

function changePriority(sel: HTMLSelectElement) {
  const val = sel.value;
  const info = PRIORITY_OPTIONS.find(o => o.value === val);
  if (info) {
    sel.className = sel.className.replace(/tag-\w+/g, '').trim();
    sel.classList.add('item-tag', 'item-priority', info.cls);
  }
  saveState();
}

function exportCSV() {
  const rows: string[][] = [['Section','Item','Priority','Status','Notes']];
  document.querySelectorAll('.section').forEach(sec => {
    const sTitle = sec.querySelector('.section-title')?.textContent?.trim() || '';
    sec.querySelectorAll('.item').forEach(item => {
      const checked = (item.querySelector('.item-check') as HTMLInputElement)?.checked;
      const text = item.querySelector('.item-text')?.textContent?.trim() || '';
      const tag = item.querySelector('.item-tag')?.textContent?.trim() || '';
      const note = (item.querySelector('.notes-area') as HTMLTextAreaElement)?.value?.trim() || '';
      rows.push([sTitle, text, tag, checked ? 'Done' : 'Pending', note]);
    });
  });
  const csv = rows.map(r => r.map(c => '"' + c.replace(/"/g, '""') + '"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sunbeams_shopify_audit_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}
