"use client";
import { useState, useEffect, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Priority = string; // "now" | "week" | "month" | "ongoing" | any custom label

interface CheckItem {
  id: string;
  text: string;
  note: string;
  placeholder: string;
  priority: Priority;
  checked: boolean;
  finding: string;
}

interface Section {
  id: string;
  num: number;
  title: string;
  badge: "critical" | "high" | "medium";
  subsections: { title: string; items: CheckItem[] }[];
}

// ── API ───────────────────────────────────────────────────────────────────────
const API_BASE = typeof window !== "undefined" ? window.location.origin : "";

async function loadFromAPI(): Promise<{sections?:Section[]; auditor?:string; storeUrl?:string} | null> {
  try {
    const r = await fetch(`${API_BASE}/api/progress`);
    if (!r.ok) return null;
    const d = await r.json();
    return d.data && Object.keys(d.data).length > 0 ? d.data : null;
  } catch { return null; }
}

async function saveToAPI(data: object) {
  try {
    await fetch(`${API_BASE}/api/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {}
}

// ── Default sections ──────────────────────────────────────────────────────────
function makeId() { return Math.random().toString(36).slice(2, 9); }

function di(text: string, note: string, priority: Priority, placeholder = ""): CheckItem {
  return { id: makeId(), text, note, placeholder, priority, checked: false, finding: "" };
}

const DEFAULT_SECTIONS: Section[] = [
  { id:"s1", num:1, title:"Store Health & Performance", badge:"critical", subsections:[
    { title:"Page Speed", items:[
      di("Run PageSpeed Insights on homepage (mobile + desktop)","Mobile LCP must be under 2.5s. Score target: 70+ mobile, 90+ desktop.","now","e.g. Mobile score: 52, LCP: 4.1s — needs image compression"),
      di("Run PageSpeed on top 3 product pages and collection pages","Product pages are high-traffic — slow load = direct revenue loss.","now","e.g. Product page LCP: 3.8s — hero image not compressed"),
      di("Check Total Blocking Time (TBT) — must be under 200ms","TBT above 600ms indicates heavy JS — usually from unused apps.","now",""),
      di("Audit all installed apps — remove any inactive or unused apps","Every app adds JS to the storefront even when inactive.","now","e.g. Found 14 apps — 6 unused, removing saves ~400ms"),
      di("Confirm all product images are compressed and served in WebP format","Shopify auto-converts to WebP, but source files must not exceed 1MB each.","week",""),
    ]},
    { title:"Technical Health", items:[
      di("Crawl store with Screaming Frog or Ahrefs — identify all 404 errors","Broken links hurt SEO and user trust. Redirect or fix all 404s.","week",""),
      di("Check for redirect chains (A→B→C) — flatten to single redirects (A→C)","Each redirect adds ~200ms of latency per hop.","week",""),
      di("Confirm SSL certificate is valid and all pages serve on HTTPS","","now",""),
      di("Verify XML sitemap is submitted to Google Search Console","Shopify generates sitemap.xml automatically — confirm it's indexed.","week",""),
      di("Check robots.txt — confirm key collection and product pages are crawlable","","week",""),
      di("Verify canonical tags are correctly set on all product and collection pages","Duplicate URLs without canonicals cause SEO dilution.","week",""),
    ]},
  ]},
  { id:"s2", num:2, title:"Brand & Visual Consistency", badge:"high", subsections:[
    { title:"Visual Identity", items:[
      di("Brand colors (#CB0033, #A47860, #D6D2C4, #F4F0EC) applied consistently across all pages","Check header, footer, buttons, badges, and hover states.","now",""),
      di("Typography consistent: Playfair Display for headings, DM Sans for body throughout","No rogue fonts from app widgets or third-party embeds.","week",""),
      di("Logo correct on all pages — no stretched, pixelated, or outdated versions","Check desktop header, mobile header, favicon, and email templates.","now",""),
      di("All sub-brand pages (Quencha, Crysalis, Primeo, Slique, Nest) use correct brand identity","Each sub-brand has its own color and typography treatment.","week",""),
      di("No clashing UI from app-injected widgets (chat bubbles, review stars, popups)","Audit visual weight — remove or restyle anything that breaks brand.","week",""),
    ]},
    { title:"Image Standards", items:[
      di("All hero images are lifestyle photography — no white-background product shots in hero positions","White-bg images in lifestyle slots read as low-effort.","week",""),
      di("Product images consistent: same angle, same white background, same padding, same aspect ratio","Inconsistency across a collection page looks unprofessional.","week",""),
      di("No stock photos that look generic — all imagery feels ownable to Sunbeams Lifestyle","Run a visual audit of the homepage and top 5 collection pages.","month",""),
    ]},
  ]},
  { id:"s3", num:3, title:"Product Pages", badge:"critical", subsections:[
    { title:"Copy & Content", items:[
      di("Every product has a title, description, key benefits (bullets), and care/usage info","No placeholder text or empty description fields.","now",""),
      di("Product titles follow format: Brand + Product Name + Key Feature + Variant","e.g. Quencha 19oz Insulated Tumbler — Matte Black","now",""),
      di("All prices correct and consistent with Lazada/Shopee pricing parity policy","Price discrepancies erode trust if customers cross-check.","now",""),
      di("Variants (size, color) all populated — no broken variants showing as unavailable","Check every SKU, especially bundles and gift sets.","now",""),
      di("At least 5 product images per SKU: hero, lifestyle, detail, dimension, in-use","Fewer than 4 images measurably reduces conversion.","week",""),
    ]},
    { title:"Trust & Conversion", items:[
      di("Reviews visible on all active products — minimum 3 reviews before running paid ads","Products with zero reviews should not receive paid traffic.","now",""),
      di("Shipping info and delivery timeline clearly visible on product page (not hidden in FAQ)","Filipino shoppers abandon if shipping info is hard to find.","now",""),
      di("Return policy clearly linked or visible near Add to Cart button","Reduces friction for first-time buyers.","week",""),
      di("Warranty information present on applicable products (Quencha, Crysalis, Primeo)","","week",""),
      di("Cross-sell / You may also like section functional and showing relevant products","Do not cross-sell products from a different sub-brand unless intentional.","month",""),
    ]},
  ]},
  { id:"s4", num:4, title:"Checkout & Conversion", badge:"critical", subsections:[
    { title:"Checkout Flow", items:[
      di("Complete a test purchase end-to-end — confirm all steps work on mobile","Do this on iOS and Android. Use a ₱1 test product.","now","e.g. Tested on iPhone 14 — payment processed, confirmation email received"),
      di("Guest checkout enabled — do not force account creation","Forced registration is the #1 checkout abandonment cause.","now",""),
      di("All payment methods working: GCash, Maya, credit card, COD (if applicable)","Test each one or verify via Shopify Payments dashboard.","now",""),
      di("Shipping rates correct — no ₱0 shipping showing when it should be paid","Check flat rate, weight-based, and free shipping threshold.","now",""),
      di("Order confirmation email sends immediately with correct order details","Check spam folder too — if it lands there, fix email sender reputation.","now",""),
    ]},
    { title:"Cart & Upsell", items:[
      di("Cart page shows product image, name, variant, quantity, and subtotal clearly","No truncated product names or missing images in cart.","week",""),
      di("Free shipping progress bar visible in cart (e.g. 'Add ₱150 more for free shipping')","Increases AOV by 15–25% on average.","week",""),
      di("Cart upsell or cross-sell configured — relevant add-on shown in cart or at checkout","Bundle offers or accessories, not random products.","month",""),
    ]},
  ]},
  { id:"s5", num:5, title:"Email & Automation (Klaviyo)", badge:"high", subsections:[
    { title:"Core Flows", items:[
      di("Welcome series active (3 emails minimum: welcome, brand story, first purchase offer)","Welcome flow generates 30–50% of total Klaviyo revenue for most brands.","now",""),
      di("Abandoned cart flow active (3 emails: 1hr, 24hr, 72hr)","3-email sequence recovers 3–5x more revenue than a single email.","now",""),
      di("Browse abandonment flow active for product page visitors","Captures intent before cart — often higher open rate than cart abandonment.","week",""),
      di("Post-purchase flow active (thank you + review request at Day 7 + replenishment at Day 30)","Review request timing: 7 days for most products, 14 days for skincare.","week",""),
      di("Win-back flow active for customers with no purchase in 90 days","Offer a discount or 'we miss you' message with a product spotlight.","month",""),
    ]},
    { title:"List Health", items:[
      di("Email list cleaned — suppressed all unengaged subscribers (no open in 180 days)","Sending to unengaged contacts tanks deliverability.","month",""),
      di("Double opt-in configured for all new signup forms","Required for GDPR compliance and improves list quality.","week",""),
      di("Unsubscribe rate below 0.3% per campaign — if higher, audit sending frequency","Above 0.5% triggers deliverability problems.","ongoing",""),
    ]},
  ]},
  { id:"s6", num:6, title:"Analytics & Tracking", badge:"critical", subsections:[
    { title:"Pixel & Conversion Tracking", items:[
      di("Meta Pixel firing on all pages — verified via Meta Pixel Helper Chrome extension","Check: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase events.","now",""),
      di("TikTok Pixel active and Purchase event firing correctly","Use TikTok Pixel Helper to verify — critical for TikTok ad optimisation.","now",""),
      di("Google Analytics 4 installed and Purchase event firing with correct revenue value","Verify in GA4 DebugView — revenue must not be ₱0 or undefined.","now",""),
      di("Google Ads conversion tracking set up and recording purchases","Without this, Smart Bidding has no data to optimise.","now",""),
      di("All pixels tested with a real purchase — confirm revenue value is correct in each platform","Pixel Helper tools do not verify revenue accuracy — only a live purchase does.","now","e.g. Tested ₱799.75 purchase — Meta shows ₱799.75 ✓, GA4 shows ₱799.75 ✓"),
    ]},
    { title:"Reporting", items:[
      di("Shopify Analytics: conversion rate, AOV, and sessions reviewed weekly","Baseline: PH e-commerce conversion rate 1.5–3%. Below 1% = CRO priority.","ongoing",""),
      di("UTM parameters on all paid ad links — no untagged traffic in GA4","Every Meta, TikTok, and Google ad must have utm_source, utm_medium, utm_campaign.","now",""),
      di("Search Console connected — impressions, clicks, and ranking keywords reviewed monthly","Identifies organic growth opportunities and indexing issues.","week",""),
    ]},
  ]},
  { id:"s7", num:7, title:"SEO", badge:"high", subsections:[
    { title:"On-Page SEO", items:[
      di("Every product page has a unique meta title and meta description","Shopify defaults to product title — this is not enough. Customize all.","week",""),
      di("Meta titles follow format: Primary Keyword | Brand Name — under 60 characters","e.g. Insulated Tumbler 550ml | Quencha by Sunbeams Lifestyle","week",""),
      di("All product images have descriptive alt text (not 'image1.jpg' or blank)","Alt text is used by screen readers and Google Image Search.","week",""),
      di("H1 tag on every product and collection page — matches primary keyword","Shopify often uses product title as H1 — verify it's correct and keyword-rich.","week",""),
      di("Collection pages have descriptive copy (150+ words) above or below the product grid","Google needs text to understand what a collection page is about.","month",""),
    ]},
    { title:"Technical SEO", items:[
      di("No duplicate product URLs — confirm /products/ pages have canonical tags","Shopify can create duplicate URLs via collections — canonicals prevent penalties.","week",""),
      di("Internal linking: collection pages link to related collections and top products","Distributes link equity and helps Google crawl the store.","month",""),
      di("Schema markup (Product, Review, BreadcrumbList) implemented on product pages","Rich snippets improve CTR in search results by 20–30%.","month",""),
    ]},
  ]},
  { id:"s8", num:8, title:"Inventory & Operations", badge:"high", subsections:[
    { title:"Stock Management", items:[
      di("All active products have inventory tracking enabled in Shopify","Products without tracking show as always in stock — dangerous.","now",""),
      di("Out-of-stock products show 'Notify me when available' button","Capturing demand for OOS products prevents permanent lost sales.","week",""),
      di("Low-stock threshold alerts configured — notify team when SKU drops below 10 units","Prevents stockouts during campaign periods.","week",""),
      di("No products marked Active with zero inventory (unless pre-order)","Active + zero stock = bad customer experience and wasted ad spend.","now",""),
    ]},
    { title:"Fulfilment", items:[
      di("Shipping zones and rates correct for all Philippine regions (Luzon, Visayas, Mindanao)","Different rates for Metro Manila vs provincial is standard — verify all zones.","now",""),
      di("Order fulfilment SLA defined and communicated: same-day cut-off, processing time, carrier","Customers expect shipping within 1–2 business days after payment.","week",""),
      di("Packaging materials stocked for at least 30 days of projected sales volume","Run out of packaging = fulfilment delay = negative reviews.","ongoing",""),
    ]},
  ]},
  { id:"s9", num:9, title:"Homepage & Navigation", badge:"medium", subsections:[
    { title:"Homepage Above the Fold", items:[
      di("Hero section: one clear headline, one CTA, lifestyle image — visible without scrolling on mobile","","now",""),
      di("Value proposition communicated above the fold (what makes Sunbeams different)","","week",""),
      di("Social proof on homepage: review count, press logos, or UGC section","","month",""),
    ]},
    { title:"Navigation", items:[
      di("Main navigation: max 6–7 items, no buried collections more than 2 clicks deep","","week",""),
      di("Search bar functional and prominent on mobile","Shopify Predictive Search app recommended for better UX.","week",""),
      di("Footer includes: contact, policies, social links, newsletter signup","","week",""),
      di("Announcement bar with current offer or free shipping threshold (not left blank)","","now",""),
    ]},
  ]},
  { id:"s10", num:10, title:"Loyalty & Retention", badge:"medium", subsections:[
    { title:"Loyalty Programme", items:[
      di("Loyalty/rewards app installed (Smile.io, Yotpo, or BON Loyalty)","Loyalty mechanics must deliver perceived value immediately — points with no near-term redemption kill engagement.","month",""),
      di("VIP customer segment defined in Klaviyo (top 10% by LTV) — receives early access and exclusive offers","","month",""),
      di("Referral programme configured — customers can share a code to earn store credit","","month",""),
    ]},
    { title:"Recurring Audit Checks", items:[
      di("Monthly review of top 10 product pages: conversion rate, bounce rate, heatmap data","","ongoing",""),
      di("Quarterly app stack audit — remove unused apps, check for duplicates","","ongoing",""),
      di("Monthly Klaviyo flow performance review — open rate, click rate, revenue per recipient","Benchmark: welcome open rate 45%+, abandoned cart recovery 8%+.","ongoing",""),
      di("One CRO experiment running at all times — test one variable per page per month","","ongoing","Current experiment: ____"),
    ]},
  ]},
];

// ── Priority config ────────────────────────────────────────────────────────────
const DEFAULT_PRIORITIES = [
  { value:"now",     label:"Now",        color:"#CB0033", bg:"#fce6ec" },
  { value:"week",    label:"This Week",  color:"#b85c00", bg:"#fff4e6" },
  { value:"month",   label:"This Month", color:"#3a5fc8", bg:"#eef4ff" },
  { value:"ongoing", label:"Ongoing",    color:"#2d7a4f", bg:"#edf7f2" },
];

type PriorityDef = { value: string; label: string; color: string; bg: string };

// Color palette for custom priorities (cycles through)
const CUSTOM_COLORS = [
  { color:"#6b35a8", bg:"#f3eeff" },
  { color:"#0e7a6e", bg:"#e6f7f5" },
  { color:"#a0522d", bg:"#fff0e6" },
  { color:"#1a5fa8", bg:"#e6f0ff" },
  { color:"#7a3d6b", bg:"#fce8f6" },
];

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Audit() {
  const [sections, setSections]         = useState<Section[]>(DEFAULT_SECTIONS);
  const [priorities, setPriorities]     = useState<PriorityDef[]>(DEFAULT_PRIORITIES);
  const [auditor,  setAuditor]          = useState("");
  const [storeUrl, setStoreUrl]         = useState("");
  const [editMode, setEditMode]         = useState(false);
  const [showPriorityMgr, setShowPM]   = useState(false);
  const [newPriorityLabel, setNewPL]   = useState("");
  const [collapsed, setCollapsed]       = useState<Record<string,boolean>>({});
  const [syncStatus, setSyncStatus]     = useState("");
  const [loaded, setLoaded]             = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const pInfo = (p: string) => priorities.find(x => x.value === p) || priorities[0];

  // Load on mount
  useEffect(() => {
    loadFromAPI().then(data => {
      if (data?.sections)   setSections(data.sections);
      if (data?.priorities) setPriorities(data.priorities);
      if (data?.auditor)    setAuditor(data.auditor);
      if (data?.storeUrl)   setStoreUrl(data.storeUrl);
      setLoaded(true);
    });
    // Poll every 30s
    const poll = setInterval(() => {
      if (!editMode) {
        loadFromAPI().then(data => {
          if (data?.sections)   setSections(data.sections);
          if (data?.priorities) setPriorities(data.priorities);
          if (data?.auditor)    setAuditor(data.auditor);
          if (data?.storeUrl)   setStoreUrl(data.storeUrl);
        });
      }
    }, 30000);
    return () => clearInterval(poll);
  }, []);

  // Auto-save with debounce
  const save = (
    newSections: Section[] = sections,
    newAuditor: string = auditor,
    newUrl: string = storeUrl,
    newPriorities: PriorityDef[] = priorities
  ) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSyncStatus("saving");
      await saveToAPI({ sections: newSections, auditor: newAuditor, storeUrl: newUrl, priorities: newPriorities });
      setSyncStatus("saved");
      setTimeout(() => setSyncStatus(""), 2500);
    }, 800);
  };

  // ── State helpers ───────────────────────────────────────────────────────────
  const updateItem = (sid: string, ssIdx: number, iIdx: number, patch: Partial<CheckItem>) => {
    const next = sections.map(s => {
      if (s.id !== sid) return s;
      const subsections = s.subsections.map((ss, si) => {
        if (si !== ssIdx) return ss;
        return { ...ss, items: ss.items.map((it, ii) => ii === iIdx ? { ...it, ...patch } : it) };
      });
      return { ...s, subsections };
    });
    setSections(next);
    save(next);
  };

  const deleteItem = (sid: string, ssIdx: number, iIdx: number) => {
    const next = sections.map(s => {
      if (s.id !== sid) return s;
      const subsections = s.subsections.map((ss, si) =>
        si !== ssIdx ? ss : { ...ss, items: ss.items.filter((_, ii) => ii !== iIdx) }
      );
      return { ...s, subsections };
    });
    setSections(next); save(next);
  };

  const addItem = (sid: string, ssIdx: number) => {
    const next = sections.map(s => {
      if (s.id !== sid) return s;
      const subsections = s.subsections.map((ss, si) =>
        si !== ssIdx ? ss : { ...ss, items: [...ss.items, di("New checklist item","","now","")] }
      );
      return { ...s, subsections };
    });
    setSections(next); save(next);
  };

  const deleteSubsection = (sid: string, ssIdx: number) => {
    const next = sections.map(s =>
      s.id !== sid ? s : { ...s, subsections: s.subsections.filter((_,i) => i !== ssIdx) }
    );
    setSections(next); save(next);
  };

  const addSubsection = (sid: string) => {
    const next = sections.map(s =>
      s.id !== sid ? s : { ...s, subsections: [...s.subsections, { title:"New Subsection", items:[] }] }
    );
    setSections(next); save(next);
  };

  const updateSubsectionTitle = (sid: string, ssIdx: number, title: string) => {
    const next = sections.map(s =>
      s.id !== sid ? s : { ...s, subsections: s.subsections.map((ss,i) => i===ssIdx ? {...ss,title} : ss) }
    );
    setSections(next); save(next);
  };

  const deleteSection = (sid: string) => {
    const next = sections.filter(s => s.id !== sid);
    setSections(next); save(next);
  };

  const addSection = () => {
    const next = [...sections, {
      id: makeId(), num: sections.length + 1,
      title: "New Section", badge: "medium" as const,
      subsections: [{ title: "Subsection", items: [] }],
    }];
    setSections(next); save(next);
  };

  const updateSectionTitle = (sid: string, title: string) => {
    const next = sections.map(s => s.id !== sid ? s : { ...s, title });
    setSections(next); save(next);
  };

  const updateSectionBadge = (sid: string, badge: Section["badge"]) => {
    const next = sections.map(s => s.id !== sid ? s : { ...s, badge });
    setSections(next); save(next);
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const allItems = sections.flatMap(s => s.subsections.flatMap(ss => ss.items));
  const total = allItems.length;
  const done  = allItems.filter(i => i.checked).length;
  const pct   = total > 0 ? Math.round(done / total * 100) : 0;
  const sectionPct = (s: Section) => {
    const items = s.subsections.flatMap(ss => ss.items);
    if (!items.length) return 0;
    return Math.round(items.filter(i => i.checked).length / items.length * 100);
  };

  const headings = ["Not started","Just getting started","Making progress","More than halfway","Almost there!","Audit complete ✓"];
  const arcOffset = 188.5 * (1 - pct / 100);
  const arcColor  = pct < 40 ? "#CB0033" : pct < 70 ? "#b85c00" : "#2d7a4f";

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [["Section","Subsection","Item","Priority","Status","Finding"]];
    sections.forEach(s => s.subsections.forEach(ss => ss.items.forEach(it => {
      rows.push([s.title, ss.title, it.text, pInfo(it.priority).label, it.checked?"Done":"Pending", it.finding]);
    })));
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], {type:"text/csv"}));
    a.download = `sunbeams_shopify_audit_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  // ── CSS ────────────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'DM Sans',sans-serif;background:#F4F0EC;color:#1a1210;font-size:14px;line-height:1.6;}

    /* HEADER */
    .header{background:#1a1210;padding:40px 48px 32px;position:relative;overflow:hidden;}
    .header::before{content:'';position:absolute;top:-60px;right:-60px;width:300px;height:300px;border-radius:50%;background:#CB0033;opacity:0.08;}
    .h-brand{font-family:'Cormorant Garamond',serif;font-size:11px;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;color:#A47860;margin-bottom:8px;}
    .h-title{font-family:'Cormorant Garamond',serif;font-size:42px;font-weight:400;color:#f4f0ec;line-height:1.1;margin-bottom:6px;}
    .h-title span{color:#CB0033;font-style:italic;}
    .h-sub{color:#9a8a84;font-size:13px;font-weight:300;letter-spacing:0.02em;margin-bottom:20px;}
    .h-meta{display:flex;gap:12px;flex-wrap:wrap;}
    .meta-chip{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);padding:6px 14px;border-radius:4px;font-size:12px;color:#9a8a84;}
    .meta-chip strong{color:#f4f0ec;font-weight:500;}
    .meta-editable{outline:none;min-width:80px;cursor:text;}
    .meta-editable:hover{text-decoration:underline;text-decoration-style:dotted;}

    /* DASHBOARD */
    .dash{position:sticky;top:0;z-index:100;background:#fff;border-bottom:1px solid #e8e2dc;padding:12px 48px;display:flex;align-items:center;gap:16px;box-shadow:0 2px 12px rgba(26,18,16,0.08);flex-wrap:wrap;}
    .score-ring{position:relative;flex-shrink:0;}
    .score-text{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;line-height:1.1;}
    .score-text span:first-child{display:block;font-size:14px;font-weight:600;color:#1a1210;}
    .score-lbl{font-size:8px;letter-spacing:0.15em;color:#9a8a84;text-transform:uppercase;}
    .score-main{flex:1;min-width:0;}
    .score-main h2{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .score-main p{font-size:12px;color:#9a8a84;margin-top:1px;}
    .stat-pills{display:flex;gap:8px;flex-shrink:0;}
    .pill{display:flex;flex-direction:column;align-items:center;padding:6px 12px;border-radius:6px;min-width:52px;}
    .pill .n{font-size:18px;font-weight:600;line-height:1;}
    .pill .l{font-size:10px;letter-spacing:0.08em;text-transform:uppercase;margin-top:2px;}
    .pill-pass{background:#edf7f2;color:#2d7a4f;}
    .pill-fail{background:#fce6ec;color:#CB0033;}
    .pill-total{background:#f0ece8;color:#5a4a44;}
    .dash-btns{display:flex;gap:8px;flex-shrink:0;align-items:center;}
    .btn-export{padding:8px 16px;background:#CB0033;color:#fff;border:none;border-radius:4px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;cursor:pointer;transition:background 0.18s;}
    .btn-export:hover{background:#9a0026;}
    .btn-edit{padding:8px 16px;background:#1a1210;color:#f4f0ec;border:none;border-radius:4px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;cursor:pointer;transition:all 0.18s;}
    .btn-edit:hover{background:#333;}
    .btn-edit.active{background:#A47860;color:#fff;}
    .btn-reset{padding:8px 14px;background:transparent;border:1.5px solid #e8e2dc;color:#5a4a44;border-radius:4px;font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;transition:all 0.18s;}
    .btn-reset:hover{border-color:#CB0033;color:#CB0033;}
    .sync{font-size:11px;letter-spacing:0.1em;min-width:70px;text-align:right;}

    /* EDIT MODE BANNER */
    .edit-banner{background:#1a1210;color:#f4f0ec;padding:10px 48px;font-size:12px;display:flex;align-items:center;gap:10px;}
    .edit-banner span{font-family:'Cormorant Garamond',serif;font-size:15px;font-style:italic;color:#A47860;}

    /* MAIN */
    .main{max-width:900px;margin:0 auto;padding:28px 24px 80px;}

    /* LEGEND */
    .legend{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:24px;padding:12px 18px;background:#fff;border-radius:8px;border:0.5px solid #e8e2dc;}
    .legend-title{font-size:11px;font-weight:500;color:#5a4a44;text-transform:uppercase;letter-spacing:0.1em;align-self:center;}
    .legend-item{display:flex;align-items:center;gap:6px;font-size:12px;color:#5a4a44;}

    /* SECTION */
    .section{background:#fff;border:1px solid #e8e2dc;border-radius:10px;margin-bottom:14px;overflow:hidden;}
    .section.edit-mode{border-color:#A47860;border-style:dashed;}
    .section-header{display:flex;align-items:center;gap:10px;padding:14px 18px;cursor:pointer;user-select:none;transition:background 0.15s;}
    .section-header:hover{background:#faf8f6;}
    .section-num{width:26px;height:26px;border-radius:50%;background:#CB0033;color:#fff;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .section-title-text{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:500;color:#1a1210;flex:1;}
    .section-title-input{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:500;color:#1a1210;flex:1;border:1px solid #A47860;border-radius:3px;padding:2px 8px;background:#fff8f4;outline:none;}
    .badge{font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:3px 9px;border-radius:3px;flex-shrink:0;}
    .badge-sel{font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:3px 9px;border-radius:3px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;outline:none;}
    .badge-critical,.badge-sel.badge-critical{background:#fce6ec;color:#CB0033;}
    .badge-high,.badge-sel.badge-high{background:#fff4e6;color:#b85c00;}
    .badge-medium,.badge-sel.badge-medium{background:#f0ece8;color:#5a4a44;}
    .section-pct{font-size:12px;color:#9a8a84;margin-left:4px;}
    .section-prog{height:3px;background:#e8e2dc;}
    .section-prog-bar{height:3px;background:#CB0033;transition:width 0.4s ease;}
    .section-body{padding:0 18px 18px;}
    .section-body.collapsed{display:none;}

    /* SUBSECTION */
    .subsec{margin-top:18px;}
    .subsec-header{display:flex;align-items:center;gap:8px;margin-bottom:9px;padding-bottom:5px;border-bottom:1px solid #e8e2dc;}
    .subsec-title{font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#A47860;flex:1;}
    .subsec-title-input{font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#A47860;flex:1;border:1px solid #A47860;border-radius:3px;padding:2px 7px;background:#fff8f4;outline:none;}
    .btn-del-ss{background:none;border:none;color:#CB0033;cursor:pointer;font-size:14px;padding:0 4px;opacity:0.6;transition:opacity 0.18s;}
    .btn-del-ss:hover{opacity:1;}

    /* ITEM */
    .item{display:flex;align-items:flex-start;gap:11px;padding:11px 10px;border-radius:6px;margin-bottom:3px;transition:background 0.15s;}
    .item:hover{background:#faf8f6;}
    .item-check{width:16px;height:16px;margin-top:2px;cursor:pointer;accent-color:#CB0033;flex-shrink:0;}
    .item-body{flex:1;min-width:0;}
    .item-text{font-size:13px;color:#1a1210;line-height:1.5;}
    .item-text.done{text-decoration:line-through;color:#9a8a84;}
    .item-text-input{font-size:13px;color:#1a1210;line-height:1.5;width:100%;border:1px solid #A47860;border-radius:3px;padding:4px 8px;background:#fff8f4;outline:none;font-family:'DM Sans',sans-serif;resize:none;}
    .item-note{font-size:11px;color:#9a8a84;margin-top:2px;line-height:1.5;}
    .item-note-input{font-size:11px;color:#5a4a44;margin-top:4px;width:100%;border:1px dashed #D6D2C4;border-radius:3px;padding:3px 7px;background:#faf8f6;outline:none;font-family:'DM Sans',sans-serif;resize:none;}
    .finding-toggle{font-size:11px;color:#A47860;background:none;border:none;cursor:pointer;padding:0;margin-top:4px;font-family:'DM Sans',sans-serif;transition:color 0.15s;}
    .finding-toggle:hover{color:#CB0033;}
    .finding-area{display:none;width:100%;margin-top:5px;padding:7px 9px;font-family:'DM Sans',sans-serif;font-size:12px;border:1px solid #e8e2dc;border-radius:4px;background:#F4F0EC;color:#1a1210;resize:vertical;min-height:48px;outline:none;}
    .finding-area:focus{border-color:#CB0033;}
    .finding-area.visible{display:block;}

    /* PRIORITY TAG */
    .ptag{font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:2px 8px;border-radius:3px;flex-shrink:0;margin-top:2px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;outline:none;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='7' height='4' viewBox='0 0 7 4'%3E%3Cpath d='M0 0l3.5 4L7 0z' fill='currentColor' opacity='0.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 5px center;padding-right:16px;}
    .ptag-now{background:#fce6ec;color:#CB0033;}
    .ptag-week{background:#fff4e6;color:#b85c00;}
    .ptag-month{background:#eef4ff;color:#3a5fc8;}
    .ptag-ongoing{background:#edf7f2;color:#2d7a4f;}

    /* EDIT MODE item buttons */
    .btn-del-item{background:none;border:none;color:#CB0033;cursor:pointer;font-size:15px;padding:0 3px;flex-shrink:0;margin-top:1px;opacity:0.5;transition:opacity 0.18s;}
    .btn-del-item:hover{opacity:1;}

    /* ADD BUTTONS */
    .btn-add-item{width:100%;padding:8px;border:1.5px dashed #D6D2C4;background:#faf8f6;color:#9a8a84;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;transition:all 0.18s;border-radius:4px;margin-top:6px;}
    .btn-add-item:hover{border-color:#A47860;color:#A47860;background:#fff8f4;}
    .btn-add-ss{padding:7px 14px;border:1.5px dashed #D6D2C4;background:#faf8f6;color:#9a8a84;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;transition:all 0.18s;border-radius:4px;margin-top:12px;display:block;}
    .btn-add-ss:hover{border-color:#A47860;color:#A47860;}
    .btn-add-section{width:100%;padding:14px;border:2px dashed #D6D2C4;background:#faf8f6;color:#9a8a84;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;cursor:pointer;transition:all 0.2s;border-radius:8px;margin-top:8px;}
    .btn-add-section:hover{border-color:#CB0033;color:#CB0033;background:#fff5f7;}
    .btn-del-section{padding:5px 12px;border:1px solid #fce6ec;background:#fce6ec;color:#CB0033;font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;border-radius:3px;transition:all 0.18s;flex-shrink:0;}
    .btn-del-section:hover{background:#CB0033;color:#fff;}

    /* PRIORITY MANAGER MODAL */
    .pm-overlay{position:fixed;inset:0;background:rgba(26,18,16,0.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;}
    .pm-modal{background:#fff;border:1.5px solid #e8e2dc;border-radius:8px;padding:28px;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(26,18,16,0.2);}
    .pm-title{font-family:'Cormorant Garamond',serif;font-size:22px;color:#1a1210;margin-bottom:4px;}
    .pm-sub{font-size:12px;color:#9a8a84;margin-bottom:20px;}
    .pm-list{display:flex;flex-direction:column;gap:8px;margin-bottom:20px;}
    .pm-row{display:flex;align-items:center;gap:10px;padding:8px 12px;background:#faf8f6;border-radius:4px;border:1px solid #e8e2dc;}
    .pm-swatch{width:32px;height:24px;border-radius:3px;flex-shrink:0;}
    .pm-label{flex:1;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;}
    .pm-default{font-size:10px;color:#9a8a84;letter-spacing:0.08em;}
    .pm-del{background:none;border:none;color:#CB0033;cursor:pointer;font-size:14px;padding:0 3px;opacity:0.5;transition:opacity 0.18s;}
    .pm-del:hover{opacity:1;}
    .pm-add{display:flex;gap:8px;align-items:center;}
    .pm-input{flex:1;border:1.5px solid #e8e2dc;border-radius:4px;padding:9px 12px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;background:#faf8f6;}
    .pm-input:focus{border-color:#CB0033;background:#fff;}
    .pm-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid #e8e2dc;}

    @media(max-width:640px){
      .header{padding:28px 18px 22px;} .h-title{font-size:30px;}
      .dash{padding:10px 14px;gap:10px;} .stat-pills{display:none;}
      .main{padding:18px 12px 60px;} .edit-banner{padding:10px 18px;}
    }
  `;

  // ── RENDER ─────────────────────────────────────────────────────────────────
  const toggleFinding = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const area = btn.nextElementSibling as HTMLTextAreaElement;
    if (area) {
      area.classList.toggle("visible");
      btn.textContent = area.classList.contains("visible") ? "− Hide finding" : "+ Add finding";
    }
  };

  return (
    <>
      <style>{css}</style>

      {/* HEADER */}
      <div className="header">
        <div className="h-brand">Sunbeams Lifestyle · Internal Operations</div>
        <div className="h-title">Shopify Store <span>Audit</span></div>
        <div className="h-sub">Comprehensive review checklist — complete before any campaign spend</div>
        <div className="h-meta">
          <div className="meta-chip">
            Auditor: <strong
              className="meta-editable"
              contentEditable suppressContentEditableWarning
              onBlur={e => { setAuditor(e.currentTarget.innerText); save(sections, e.currentTarget.innerText, storeUrl, priorities); }}
            >{auditor || "Click to add name"}</strong>
          </div>
          <div className="meta-chip">Date: <strong>{new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</strong></div>
          <div className="meta-chip">
            Store URL: <strong
              className="meta-editable"
              contentEditable suppressContentEditableWarning
              onBlur={e => { setStoreUrl(e.currentTarget.innerText); save(sections, auditor, e.currentTarget.innerText, priorities); }}
            >{storeUrl || "Click to add URL"}</strong>
          </div>
        </div>
      </div>

      {/* DASHBOARD */}
      <div className="dash">
        <div className="score-ring">
          <svg width="68" height="68" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="30" fill="none" stroke="#e8e2dc" strokeWidth="5"/>
            <circle cx="36" cy="36" r="30" fill="none" stroke={arcColor} strokeWidth="5"
                    strokeLinecap="round" strokeDasharray="188.5"
                    strokeDashoffset={arcOffset}
                    style={{transition:"stroke-dashoffset 0.5s ease,stroke 0.5s ease"}}/>
          </svg>
          <div className="score-text">
            <span>{pct}%</span>
            <span className="score-lbl">DONE</span>
          </div>
        </div>
        <div className="score-main">
          <h2>{headings[Math.min(Math.floor(pct/20),5)]}</h2>
          <p>{done} of {total} items checked</p>
        </div>
        <div className="stat-pills">
          <div className="pill pill-pass"><span className="n">{done}</span><span className="l">Pass</span></div>
          <div className="pill pill-fail"><span className="n">{total-done}</span><span className="l">Fix</span></div>
          <div className="pill pill-total"><span className="n">{total}</span><span className="l">Total</span></div>
        </div>
        <div className="dash-btns">
          <span className="sync" style={{color: syncStatus==="saved"?"#2d7a4f":syncStatus==="saving"?"#9a8a84":"#CB0033"}}>
            {syncStatus==="saving"?"Syncing…":syncStatus==="saved"?"✓ Saved":syncStatus==="error"?"Sync failed":""}
          </span>
          <button className={`btn-edit ${editMode?"active":""}`} onClick={() => setEditMode(m=>!m)}>
            {editMode ? "✓ Done Editing" : "✏ Edit Checklist"}
          </button>
          <button className="btn-reset" style={{borderColor:"#A47860",color:"#A47860"}} onClick={() => setShowPM(true)}>
            ⊕ Priorities
          </button>
          <button className="btn-export" onClick={exportCSV}>Export CSV</button>
          <button className="btn-reset" onClick={() => {
            if(confirm("Reset all progress? This cannot be undone.")) {
              const reset = sections.map(s => ({...s, subsections: s.subsections.map(ss => ({...ss, items: ss.items.map(it => ({...it,checked:false,finding:""}))}))}));
              setSections(reset); save(reset, auditor, storeUrl, priorities);
            }
          }}>Reset</button>
        </div>
      </div>

      {/* EDIT MODE BANNER */}
      {editMode && (
        <div className="edit-banner">
          <span>Edit Mode</span> — click any text to edit · use ✕ to delete · use + buttons to add items, subsections, or sections
        </div>
      )}

      {/* MAIN */}
      <div className="main">
        {/* Legend */}
        <div className="legend">
          <span className="legend-title">Priority:</span>
          {priorities.map(p => (
            <span key={p.value} className="legend-item">
              <span style={{fontSize:10,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",padding:"2px 8px",borderRadius:3,background:p.bg,color:p.color,cursor:"default"}}>{p.label}</span>
              {p.value==="now"?"Fix today":p.value==="week"?"Fix within 7 days":p.value==="month"?"30-day task":p.value==="ongoing"?"Recurring review":"Custom"}
            </span>
          ))}
        </div>

        {/* Sections */}
        {sections.map((s) => {
          const spct = sectionPct(s);
          const isCollapsed = collapsed[s.id];
          return (
            <div key={s.id} className={`section ${editMode?"edit-mode":""}`}>
              <div className="section-header" onClick={() => !editMode && setCollapsed(c => ({...c,[s.id]:!c[s.id]}))}>
                <div className="section-num">{s.num}</div>
                {editMode ? (
                  <input className="section-title-input" value={s.title}
                    onChange={e => updateSectionTitle(s.id, e.target.value)}
                    onClick={e => e.stopPropagation()} />
                ) : (
                  <div className="section-title-text">{s.title}</div>
                )}
                {editMode ? (
                  <select className={`badge-sel badge-${s.badge}`} value={s.badge}
                    onChange={e => { e.stopPropagation(); updateSectionBadge(s.id, e.target.value as Section["badge"]); }}
                    onClick={e => e.stopPropagation()}>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                  </select>
                ) : (
                  <span className={`badge badge-${s.badge}`}>{s.badge.charAt(0).toUpperCase()+s.badge.slice(1)}</span>
                )}
                <span className="section-pct">{spct}%</span>
                {editMode && (
                  <button className="btn-del-section" onClick={e => { e.stopPropagation(); if(confirm(`Delete section "${s.title}"?`)) deleteSection(s.id); }}>
                    Delete Section
                  </button>
                )}
              </div>
              <div className="section-prog"><div className="section-prog-bar" style={{width:`${spct}%`}}/></div>

              <div className={`section-body ${isCollapsed&&!editMode?"collapsed":""}`}>
                {s.subsections.map((ss, ssIdx) => (
                  <div key={ssIdx} className="subsec">
                    <div className="subsec-header">
                      {editMode ? (
                        <input className="subsec-title-input" value={ss.title}
                          onChange={e => updateSubsectionTitle(s.id, ssIdx, e.target.value)} />
                      ) : (
                        <div className="subsec-title">{ss.title}</div>
                      )}
                      {editMode && (
                        <button className="btn-del-ss" title="Delete subsection"
                          onClick={() => { if(confirm(`Delete subsection "${ss.title}"?`)) deleteSubsection(s.id, ssIdx); }}>✕</button>
                      )}
                    </div>

                    {ss.items.map((it, iIdx) => (
                      <div key={it.id} className="item">
                        {!editMode && (
                          <input type="checkbox" className="item-check" checked={it.checked}
                            onChange={e => updateItem(s.id, ssIdx, iIdx, {checked: e.target.checked})} />
                        )}
                        <div className="item-body">
                          {editMode ? (
                            <textarea className="item-text-input" value={it.text} rows={2}
                              onChange={e => updateItem(s.id, ssIdx, iIdx, {text: e.target.value})} />
                          ) : (
                            <div className={`item-text ${it.checked?"done":""}`}>{it.text}</div>
                          )}
                          {editMode ? (
                            <textarea className="item-note-input" value={it.note} rows={1}
                              placeholder="Add a note (optional)..."
                              onChange={e => updateItem(s.id, ssIdx, iIdx, {note: e.target.value})} />
                          ) : (
                            it.note && <div className="item-note">{it.note}</div>
                          )}
                          {!editMode && (
                            <>
                              <button className="finding-toggle" onClick={toggleFinding}>+ Add finding</button>
                              <textarea className={`finding-area ${it.finding?"visible":""}`}
                                defaultValue={it.finding}
                                placeholder={it.placeholder||""}
                                onBlur={e => updateItem(s.id, ssIdx, iIdx, {finding: e.target.value})} />
                            </>
                          )}
                        </div>
                        <select
                          value={it.priority}
                          onChange={e => updateItem(s.id, ssIdx, iIdx, {priority: e.target.value})}
                          style={{
                            fontSize:10, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase",
                            padding:"2px 16px 2px 8px", borderRadius:3, flexShrink:0, marginTop:2,
                            border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", outline:"none",
                            appearance:"none", WebkitAppearance:"none",
                            background:`${pInfo(it.priority).bg} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='7' height='4' viewBox='0 0 7 4'%3E%3Cpath d='M0 0l3.5 4L7 0z' fill='currentColor' opacity='0.5'/%3E%3C/svg%3E") no-repeat right 5px center`,
                            color: pInfo(it.priority).color,
                          }}>
                          {priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                        {editMode && (
                          <button className="btn-del-item" onClick={() => deleteItem(s.id, ssIdx, iIdx)} title="Delete item">✕</button>
                        )}
                      </div>
                    ))}

                    {editMode && (
                      <button className="btn-add-item" onClick={() => addItem(s.id, ssIdx)}>+ Add Item</button>
                    )}
                  </div>
                ))}

                {editMode && (
                  <button className="btn-add-ss" onClick={() => addSubsection(s.id)}>+ Add Subsection</button>
                )}
              </div>
            </div>
          );
        })}

        {editMode && (
          <button className="btn-add-section" onClick={addSection}>+ Add New Section</button>
        )}
      </div>
      {/* PRIORITY MANAGER MODAL */}
      {showPriorityMgr && (
        <div className="pm-overlay" onClick={() => setShowPM(false)}>
          <div className="pm-modal" onClick={e => e.stopPropagation()}>
            <div className="pm-title">Priority Labels</div>
            <div className="pm-sub">Manage the priority options available on every checklist item.</div>
            <div className="pm-list">
              {priorities.map((p, i) => (
                <div key={p.value} className="pm-row">
                  <div className="pm-swatch" style={{background: p.bg, border:`1.5px solid ${p.color}`}}/>
                  <span className="pm-label" style={{color: p.color}}>{p.label}</span>
                  {DEFAULT_PRIORITIES.find(d => d.value === p.value) ? (
                    <span className="pm-default">Default</span>
                  ) : (
                    <button className="pm-del" title="Delete" onClick={() => {
                      const next = priorities.filter((_,x) => x !== i);
                      setPriorities(next);
                      save(sections, auditor, storeUrl, next);
                    }}>✕</button>
                  )}
                </div>
              ))}
            </div>
            <div className="pm-add">
              <input
                className="pm-input"
                placeholder="e.g. Next Quarter, Blocked, Today..."
                value={newPriorityLabel}
                onChange={e => setNewPL(e.target.value)}
                onKeyDown={e => { if(e.key==="Enter") e.currentTarget.blur(); }}
              />
              <button className="btn-export" style={{whiteSpace:"nowrap"}} onClick={() => {
                const label = newPriorityLabel.trim();
                if (!label) return;
                const value = label.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
                if (priorities.find(p => p.value === value)) return;
                const colorSet = CUSTOM_COLORS[(priorities.length - DEFAULT_PRIORITIES.length) % CUSTOM_COLORS.length];
                const next = [...priorities, { value, label, ...colorSet }];
                setPriorities(next);
                save(sections, auditor, storeUrl, next);
                setNewPL("");
              }}>+ Add</button>
            </div>
            <div className="pm-actions">
              <button className="btn-reset" onClick={() => setShowPM(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
