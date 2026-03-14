"use client";

import { useState, useEffect, useRef, memo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  Heart, Users, Shield, Leaf, Phone, Mail, MapPin, Clock,
  ChevronDown, ArrowRight, Star, Menu, X, Sun, Moon,
  Sparkles, HandHeart, Home, Stethoscope, Gift, ArrowUpRight
} from "lucide-react";

/* ─── Intersection Observer hook ─── */
function useInView(threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold, rootMargin: "0px 0px -40px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ─── Animated counter ─── */
const Counter = memo(({ end, suffix = "" }) => {
  const [val, setVal] = useState(0);
  const [ref, visible] = useInView();
  const done = useRef(false);
  useEffect(() => {
    if (!visible || done.current) return;
    done.current = true;
    let cur = 0;
    const step = end / 40;
    const t = setInterval(() => {
      cur += step;
      if (cur >= end) { setVal(end); clearInterval(t); }
      else setVal(Math.floor(cur));
    }, 35);
    return () => clearInterval(t);
  }, [visible, end]);
  return <span ref={ref}>{val}{suffix}</span>;
});
Counter.displayName = "Counter";

/* ─── Styles injected once ─── */
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;0,900;1,500;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');

  :root {
    --cream:    #F7F2EA;
    --cream-2:  #EDE5D4;
    --forest:   #1C3829;
    --forest-2: #2D5240;
    --terra:    #C0522A;
    --terra-2:  #983F1E;
    --amber:    #D4A017;
    --stone:    #7A6B58;
    --ink:      #1A1208;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .gg-body {
    font-family: 'DM Sans', system-ui, sans-serif;
    background: var(--cream);
    color: var(--ink);
    overflow-x: hidden;
  }

  /* Grain overlay */
  .gg-grain::after {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9999;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 200px;
  }

  /* Reveal animation */
  .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1); }
  .reveal.visible { opacity: 1; transform: none; }
  .reveal-d1 { transition-delay: 0.1s; }
  .reveal-d2 { transition-delay: 0.2s; }
  .reveal-d3 { transition-delay: 0.3s; }
  .reveal-d4 { transition-delay: 0.4s; }

  /* NAV */
  .gg-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    transition: background 0.4s, border-color 0.4s, backdrop-filter 0.4s;
    border-bottom: 1px solid transparent;
  }
  .gg-nav.scrolled {
    background: rgba(247,242,234,0.92);
    backdrop-filter: blur(12px);
    border-color: var(--cream-2);
  }
  .gg-nav-inner {
    max-width: 1200px; margin: 0 auto; padding: 0 32px;
    height: 72px; display: flex; align-items: center; justify-content: space-between;
  }
  .gg-logo { display: flex; align-items: center; gap: 12px; text-decoration: none; }
  .gg-logo-mark {
    width: 40px; height: 40px; border-radius: 10px;
    background: var(--forest); display: flex; align-items: center; justify-content: center;
    font-size: 20px; flex-shrink: 0;
  }
  .gg-logo-text h1 { font-family: 'Playfair Display', serif; font-size: 17px; font-weight: 700; color: var(--forest); line-height: 1.2; }
  .gg-logo-text p { font-size: 11px; color: var(--stone); letter-spacing: 0.05em; }
  .gg-logo-text.light h1 { color: #fff; }
  .gg-logo-text.light p { color: rgba(255,255,255,0.65); }
  .gg-nav-links { display: flex; align-items: center; gap: 36px; }
  .gg-nav-link {
    font-size: 14px; font-weight: 500; text-decoration: none; color: var(--ink);
    opacity: 0.7; transition: opacity 0.2s;
  }
  .gg-nav-link:hover { opacity: 1; }
  .gg-nav-link.light { color: #fff; opacity: 0.8; }
  .gg-nav-link.light:hover { opacity: 1; }
  .gg-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 22px; border-radius: 8px; font-size: 14px; font-weight: 600;
    text-decoration: none; cursor: pointer; border: none; transition: all 0.2s; font-family: 'DM Sans', sans-serif;
  }
  .gg-btn-forest { background: var(--forest); color: #fff; }
  .gg-btn-forest:hover { background: var(--forest-2); transform: translateY(-1px); }
  .gg-btn-terra { background: var(--terra); color: #fff; }
  .gg-btn-terra:hover { background: var(--terra-2); transform: translateY(-1px); }
  .gg-btn-ghost { background: transparent; color: #fff; border: 1.5px solid rgba(255,255,255,0.45); }
  .gg-btn-ghost:hover { background: rgba(255,255,255,0.1); }
  .gg-btn-outline { background: transparent; color: var(--forest); border: 1.5px solid var(--forest); }
  .gg-btn-outline:hover { background: var(--forest); color: #fff; }
  .gg-btn-lg { padding: 14px 30px; font-size: 16px; border-radius: 10px; }

  /* Mobile menu */
  .gg-hamburger { background: none; border: none; cursor: pointer; display: none; color: var(--ink); }
  .gg-mobile-menu {
    display: none; background: var(--cream); border-top: 1px solid var(--cream-2);
    padding: 20px 32px; flex-direction: column; gap: 16px;
  }
  .gg-mobile-menu.open { display: flex; }
  .gg-mobile-link { font-size: 16px; font-weight: 500; color: var(--ink); text-decoration: none; opacity: 0.8; }
  .gg-mobile-actions { display: flex; gap: 12px; padding-top: 8px; border-top: 1px solid var(--cream-2); flex-wrap: wrap; }

  @media (max-width: 900px) {
    .gg-nav-links { display: none; }
    .gg-hamburger { display: flex; }
    .gg-nav-actions { display: none; }
  }

  /* HERO */
  .gg-hero {
    min-height: 100dvh; position: relative; display: flex; align-items: flex-end;
    background: var(--forest); overflow: hidden;
  }
  .gg-hero-bg {
    position: absolute; inset: 0;
    background-image: linear-gradient(to bottom, rgba(28,56,41,0.25) 0%, rgba(28,56,41,0.6) 55%, rgba(28,56,41,0.95) 100%),
      url('https://govardhangoushalakokan.com/wp-content/uploads/2025/07/goverdhan-0-37-scaled.jpg');
    background-size: cover; background-position: center 40%;
  }
  .gg-hero-ornament {
    position: absolute; top: 0; right: 0; width: 420px; height: 420px;
    border-radius: 50%; background: var(--terra); opacity: 0.08;
    transform: translate(40%, -40%);
  }
  .gg-hero-ornament2 {
    position: absolute; bottom: -80px; left: -80px; width: 320px; height: 320px;
    border-radius: 50%; background: var(--amber); opacity: 0.06;
  }
  .gg-hero-inner {
    position: relative; z-index: 2; max-width: 1200px; margin: 0 auto; padding: 0 32px;
    padding-bottom: 96px; width: 100%;
  }
  .gg-hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
    backdrop-filter: blur(8px); border-radius: 100px; padding: 7px 16px;
    font-size: 13px; color: rgba(255,255,255,0.85); letter-spacing: 0.06em;
    margin-bottom: 28px;
  }
  .gg-hero-badge span { color: var(--amber); }
  .gg-hero-title {
    font-family: 'Playfair Display', serif; font-size: clamp(52px, 8vw, 100px);
    font-weight: 900; line-height: 1.0; color: #fff; margin-bottom: 8px;
  }
  .gg-hero-title em { font-style: italic; color: var(--amber); display: block; }
  .gg-hero-subtitle {
    font-size: clamp(16px, 2.5vw, 22px); color: rgba(255,255,255,0.7);
    font-weight: 300; margin-bottom: 40px; max-width: 520px; line-height: 1.6;
    margin-top: 16px;
  }
  .gg-hero-actions { display: flex; gap: 14px; flex-wrap: wrap; }
  .gg-hero-scroll {
    position: absolute; bottom: 28px; right: 32px; z-index: 2;
    color: rgba(255,255,255,0.45); text-decoration: none;
    display: flex; align-items: center; gap: 8px; font-size: 12px; letter-spacing: 0.08em;
    transition: color 0.2s;
  }
  .gg-hero-scroll:hover { color: rgba(255,255,255,0.8); }
  .gg-scroll-line {
    width: 1px; height: 40px; background: rgba(255,255,255,0.3);
    position: relative; overflow: hidden;
  }
  .gg-scroll-line::after {
    content: ''; position: absolute; top: -100%; left: 0; width: 100%; height: 100%;
    background: white;
    animation: scrollLine 1.8s ease-in-out infinite;
  }
  @keyframes scrollLine { 0% { top: -100%; } 100% { top: 100%; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

  /* BAND */
  .gg-band {
    background: var(--terra); padding: 18px 32px;
    display: flex; align-items: center; justify-content: center;
    gap: 48px; overflow: hidden; flex-wrap: wrap;
  }
  .gg-band-item { display: flex; align-items: center; gap: 10px; color: #fff; }
  .gg-band-num { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700; }
  .gg-band-label { font-size: 13px; opacity: 0.85; }
  .gg-band-divider { width: 1px; height: 32px; background: rgba(255,255,255,0.25); }

  /* SECTION BASE */
  .gg-section { padding: 104px 32px; max-width: 1200px; margin: 0 auto; }
  .gg-section-label {
    font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase;
    color: var(--terra); margin-bottom: 14px;
  }
  .gg-section-title {
    font-family: 'Playfair Display', serif; font-size: clamp(32px, 5vw, 54px);
    font-weight: 700; line-height: 1.15; color: var(--forest);
  }
  .gg-section-title em { font-style: italic; color: var(--terra); }
  .gg-section-body { font-size: 17px; color: var(--stone); line-height: 1.75; max-width: 540px; margin-top: 18px; }

  /* ABOUT */
  .gg-about { background: var(--cream); }
  .gg-about-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
  .gg-about-img {
    position: relative; border-radius: 24px; overflow: hidden;
    aspect-ratio: 4/5; background: var(--cream-2);
  }
  .gg-about-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .gg-about-img-badge {
    position: absolute; bottom: 24px; left: 24px;
    background: var(--forest); color: #fff; border-radius: 14px;
    padding: 14px 20px;
  }
  .gg-about-img-badge .num { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 700; }
  .gg-about-img-badge .lbl { font-size: 12px; opacity: 0.7; margin-top: 2px; }
  .gg-values { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 36px; }
  .gg-value {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 16px; border-radius: 12px; background: var(--cream-2);
    border: 1px solid rgba(0,0,0,0.05);
  }
  .gg-value-icon {
    width: 36px; height: 36px; border-radius: 8px; background: var(--forest);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    color: var(--amber);
  }
  .gg-value h3 { font-size: 14px; font-weight: 600; color: var(--forest); }
  .gg-value p { font-size: 12px; color: var(--stone); margin-top: 2px; line-height: 1.5; }

  /* GALLERY */
  .gg-gallery-bg { background: var(--forest); }
  .gg-gallery-section { color: #fff; }
  .gg-gallery-section .gg-section-label { color: var(--amber); }
  .gg-gallery-section .gg-section-title { color: #fff; }
  .gg-gallery-section .gg-section-title em { color: var(--amber); }
  .gg-gallery-section .gg-section-body { color: rgba(255,255,255,0.6); }
  .gg-gallery-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-top: 56px; }
  .gg-cow-card {
    border-radius: 20px; overflow: hidden; position: relative;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
    transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), border-color 0.35s;
  }
  .gg-cow-card:hover { transform: translateY(-6px); border-color: rgba(255,255,255,0.25); }
  .gg-cow-img { aspect-ratio: 3/4; overflow: hidden; position: relative; }
  .gg-cow-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s ease; display: block; }
  .gg-cow-card:hover .gg-cow-img img { transform: scale(1.05); }
  .gg-cow-tag {
    position: absolute; top: 14px; left: 14px;
    background: var(--terra); color: #fff; font-size: 11px; font-weight: 600;
    padding: 4px 10px; border-radius: 100px; letter-spacing: 0.04em;
  }
  .gg-cow-tag.sponsored { background: var(--amber); color: var(--forest); }
  .gg-cow-info { padding: 16px; }
  .gg-cow-name { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 600; color: #fff; }
  .gg-cow-age { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 2px; }
  .gg-cow-btn {
    display: flex; align-items: center; gap: 6px; margin-top: 12px;
    font-size: 13px; font-weight: 600; color: var(--amber); text-decoration: none; cursor: pointer;
    background: none; border: none; padding: 0; font-family: 'DM Sans', sans-serif;
    transition: gap 0.2s;
  }
  .gg-cow-btn:hover { gap: 10px; }

  /* SEVA */
  .gg-seva-bg { background: var(--cream-2); }
  .gg-seva-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-top: 56px; }
  .gg-seva-card {
    background: var(--cream); border-radius: 20px; padding: 32px 24px;
    border: 1px solid rgba(0,0,0,0.06); position: relative; overflow: hidden;
    transition: box-shadow 0.35s, transform 0.35s;
  }
  .gg-seva-card:hover { box-shadow: 0 24px 56px rgba(28,56,41,0.1); transform: translateY(-4px); }
  .gg-seva-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: var(--terra);
  }
  .gg-seva-icon {
    width: 52px; height: 52px; border-radius: 14px; background: var(--forest);
    display: flex; align-items: center; justify-content: center; color: var(--amber);
    margin-bottom: 20px;
  }
  .gg-seva-name { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: var(--forest); }
  .gg-seva-desc { font-size: 14px; color: var(--stone); line-height: 1.6; margin: 8px 0 16px; }
  .gg-seva-price { font-size: 24px; font-weight: 700; color: var(--terra); font-family: 'Playfair Display', serif; }

  /* DONATE */
  .gg-donate { background: var(--cream); }
  .gg-donate-inner { max-width: 680px; margin: 0 auto; text-align: center; }
  .gg-donate-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 40px 0 24px; }
  .gg-donate-opt {
    padding: 20px 12px; border-radius: 14px; border: 1.5px solid var(--cream-2);
    background: var(--cream); cursor: pointer; transition: all 0.2s; text-align: center;
  }
  .gg-donate-opt:hover, .gg-donate-opt.active { border-color: var(--terra); background: rgba(192,82,42,0.05); }
  .gg-donate-opt .amt { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: var(--forest); }
  .gg-donate-opt .lbl { font-size: 11px; color: var(--stone); margin-top: 4px; line-height: 1.4; }
  .gg-donate-custom {
    display: flex; gap: 12px; margin-bottom: 14px;
  }
  .gg-donate-input {
    flex: 1; padding: 14px 18px; border-radius: 10px;
    border: 1.5px solid var(--cream-2); background: var(--cream);
    font-size: 16px; font-family: 'DM Sans', sans-serif; color: var(--ink);
    transition: border-color 0.2s; outline: none;
  }
  .gg-donate-input:focus { border-color: var(--terra); }
  .gg-donate-note { font-size: 13px; color: var(--stone); margin-top: 12px; }

  /* TESTIMONIALS */
  .gg-testi-bg { background: var(--forest); }
  .gg-testi-section .gg-section-title { color: #fff; }
  .gg-testi-section .gg-section-label { color: var(--amber); }
  .gg-testi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 56px; }
  .gg-testi-card {
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px; padding: 32px;
    transition: background 0.3s, border-color 0.3s;
  }
  .gg-testi-card:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }
  .gg-testi-stars { display: flex; gap: 4px; margin-bottom: 18px; }
  .gg-testi-quote { font-size: 16px; color: rgba(255,255,255,0.8); line-height: 1.7; font-style: italic; margin-bottom: 24px; }
  .gg-testi-author { font-weight: 600; color: #fff; font-size: 15px; }
  .gg-testi-role { font-size: 13px; color: var(--amber); margin-top: 3px; }

  /* CONTACT */
  .gg-contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: start; }
  .gg-contact-item { display: flex; gap: 16px; margin-bottom: 28px; align-items: flex-start; }
  .gg-contact-icon {
    width: 44px; height: 44px; border-radius: 10px; background: var(--forest);
    display: flex; align-items: center; justify-content: center; color: var(--amber); flex-shrink: 0;
  }
  .gg-contact-label { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--stone); margin-bottom: 4px; }
  .gg-contact-val { font-size: 15px; color: var(--ink); font-weight: 500; }
  .gg-form { display: flex; flex-direction: column; gap: 14px; }
  .gg-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .gg-input {
    padding: 14px 18px; border-radius: 10px;
    border: 1.5px solid var(--cream-2); background: var(--cream);
    font-size: 15px; font-family: 'DM Sans', sans-serif; color: var(--ink);
    transition: border-color 0.2s; outline: none; width: 100%;
  }
  .gg-input:focus { border-color: var(--forest); }
  .gg-textarea { resize: none; min-height: 130px; }

  /* FOOTER */
  .gg-footer { background: var(--ink); color: rgba(255,255,255,0.55); padding: 72px 32px 32px; }
  .gg-footer-inner { max-width: 1200px; margin: 0 auto; }
  .gg-footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 48px; margin-bottom: 56px; }
  .gg-footer-brand h2 { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 10px; }
  .gg-footer-brand p { font-size: 14px; line-height: 1.7; max-width: 260px; }
  .gg-footer-col h4 { font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 18px; }
  .gg-footer-col a, .gg-footer-col p { display: block; font-size: 14px; color: rgba(255,255,255,0.55); text-decoration: none; margin-bottom: 10px; transition: color 0.2s; }
  .gg-footer-col a:hover { color: #fff; }
  .gg-footer-bottom { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 28px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
  .gg-footer-copy { font-size: 13px; }
  .gg-footer-staff { font-size: 13px; color: var(--amber); text-decoration: none; transition: color 0.2s; }
  .gg-footer-staff:hover { color: #fff; }

  /* Responsive */
  @media (max-width: 1024px) {
    .gg-gallery-grid { grid-template-columns: repeat(2, 1fr); }
    .gg-seva-grid { grid-template-columns: repeat(2, 1fr); }
    .gg-testi-grid { grid-template-columns: repeat(2, 1fr); }
    .gg-footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
  }
  @media (max-width: 768px) {
    .gg-section { padding: 72px 20px; }
    .gg-about-grid { grid-template-columns: 1fr; gap: 40px; }
    .gg-contact-grid { grid-template-columns: 1fr; gap: 40px; }
    .gg-values { grid-template-columns: 1fr; }
    .gg-donate-grid { grid-template-columns: repeat(2, 1fr); }
    .gg-gallery-grid { grid-template-columns: 1fr 1fr; }
    .gg-seva-grid { grid-template-columns: 1fr; }
    .gg-testi-grid { grid-template-columns: 1fr; }
    .gg-footer-grid { grid-template-columns: 1fr; }
    .gg-band { gap: 24px; }
    .gg-band-divider { display: none; }
    .gg-form-row { grid-template-columns: 1fr; }
    .gg-donate-custom { flex-direction: column; }
    .gg-nav-inner { padding: 0 20px; }
    .gg-mobile-menu { padding: 20px; }
  }
`;

/* ─── Nav ─── */
const Nav = memo(({ isDark, setIsDark }) => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { href: "#about", label: "Our Story" },
    { href: "#cows", label: "Our Cows" },
    { href: "#seva", label: "Seva" },
    { href: "#contact", label: "Visit Us" },
  ];

  return (
    <>
      <nav className={`gg-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="gg-nav-inner">
          <Link href="/" className="gg-logo">
            <div className="gg-logo-mark">🐄</div>
            <div className={`gg-logo-text ${!scrolled ? "light" : ""}`}>
              <h1>Govardhan Goshala</h1>
              <p>गौ सेवा • Cow Sanctuary</p>
            </div>
          </Link>

          <div className="gg-nav-links">
            {links.map(l => (
              <a key={l.href} href={l.href} className={`gg-nav-link ${!scrolled ? "light" : ""}`}>{l.label}</a>
            ))}
          </div>

          <div className="gg-nav-actions" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <a href="#donate" className="gg-btn gg-btn-terra" style={{ padding: "9px 20px", fontSize: 13 }}>Donate</a>
            <Link href={session ? "/dashboard" : "/login"} className={`gg-btn ${scrolled ? "gg-btn-forest" : "gg-btn-ghost"}`} style={{ padding: "9px 20px", fontSize: 13 }}>
              {session ? "Dashboard" : "Staff Login"}
            </Link>
          </div>

          <button className="gg-hamburger" onClick={() => setOpen(!open)} aria-label="Menu" style={{ color: scrolled ? "var(--ink)" : "#fff" }}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <div className={`gg-mobile-menu ${open ? "open" : ""}`}>
          {links.map(l => <a key={l.href} href={l.href} className="gg-mobile-link" onClick={() => setOpen(false)}>{l.label}</a>)}
          <div className="gg-mobile-actions">
            <a href="#donate" className="gg-btn gg-btn-terra">Donate</a>
            <Link href={session ? "/dashboard" : "/login"} className="gg-btn gg-btn-outline">{session ? "Dashboard" : "Staff Login"}</Link>
          </div>
        </div>
      </nav>
    </>
  );
});
Nav.displayName = "Nav";

/* ─── Hero ─── */
function Hero() {
  return (
    <section className="gg-hero" id="home">
      <div className="gg-hero-bg" />
      <div className="gg-hero-ornament" />
      <div className="gg-hero-ornament2" />
      <div className="gg-hero-inner">
        <div className="gg-hero-badge">
          <span>✦</span>&nbsp;ॐ गाँ गौमात्रे नमः &nbsp;<span>✦</span>
        </div>
        <h1 className="gg-hero-title">
          Protecting<br />
          <em>Sacred Lives</em>
        </h1>
        <p className="gg-hero-subtitle">
          For over a decade, we have been a refuge of love and reverence for abandoned, injured and elderly cows — गौ माता की सेवा में समर्पित
        </p>
        <div className="gg-hero-actions">
          <a href="#donate" className="gg-btn gg-btn-terra gg-btn-lg">
            <Heart size={18} /> Offer Seva
          </a>
          <a href="#about" className="gg-btn gg-btn-ghost gg-btn-lg">
            Discover Our Story <ArrowRight size={18} />
          </a>
        </div>
      </div>
      <a href="#about" className="gg-hero-scroll">
        <div className="gg-scroll-line" />
        <span style={{ writingMode: "vertical-rl", letterSpacing: "0.12em", fontSize: 11 }}>SCROLL</span>
      </a>
    </section>
  );
}

/* ─── Stats band ─── */
function StatsBand() {
  const stats = [
    { end: 500, suffix: "+", label: "Cows Protected" },
    { end: 150, suffix: "+", label: "Rescued This Year" },
    { end: 75, suffix: "+", label: "Cows Adopted" },
    { end: 10, suffix: "+", label: "Years of Service" },
  ];
  return (
    <div className="gg-band">
      {stats.map((s, i) => (
        <>
          {i > 0 && <div key={`div-${i}`} className="gg-band-divider" />}
          <div key={s.label} className="gg-band-item">
            <div className="gg-band-num"><Counter end={s.end} suffix={s.suffix} /></div>
            <div className="gg-band-label">{s.label}</div>
          </div>
        </>
      ))}
    </div>
  );
}

/* ─── About ─── */
function About() {
  const [ref, visible] = useInView();
  const values = [
    { icon: Heart, label: "Compassion", desc: "Love for every cow" },
    { icon: Shield, label: "Protection", desc: "Rescue & rehabilitation" },
    { icon: Leaf, label: "Sustainability", desc: "Organic practices" },
    { icon: Users, label: "Community", desc: "Education & inspiration" },
  ];
  return (
    <section className="gg-about" id="about">
      <div className="gg-section">
        <div ref={ref} className={`gg-about-grid reveal ${visible ? "visible" : ""}`}>
          <div className="gg-about-img">
            <Image
              src="https://govardhangoushalakokan.com/wp-content/uploads/2025/06/goverdhan-0-53.jpg"
              alt="Indigenous cow at Govardhan Goshala"
              fill
              style={{ objectFit: "cover" }}
              sizes="(max-width: 768px) 100vw, 50vw"
              unoptimized
            />
            <div className="gg-about-img-badge">
              <div className="num">Est. 2014</div>
              <div className="lbl">Mathura, Uttar Pradesh</div>
            </div>
          </div>
          <div>
            <p className="gg-section-label">About Govardhan Goshala</p>
            <h2 className="gg-section-title">A Sacred Shelter for<br /><em>Divine Mothers</em></h2>
            <p className="gg-section-body">
              Established with a vision rooted in dharma and compassion, Govardhan Goshala has been a sanctuary where every cow receives the love, care, and reverence she deserves. We rescue, rehabilitate, and provide lifelong sanctuary to cows who have nowhere else to go.
            </p>
            <div className="gg-values">
              {values.map(v => (
                <div key={v.label} className="gg-value">
                  <div className="gg-value-icon"><v.icon size={16} /></div>
                  <div><h3>{v.label}</h3><p>{v.desc}</p></div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 36 }}>
              <a href="#contact" className="gg-btn gg-btn-outline">Visit the Goshala <ArrowUpRight size={16} /></a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Gallery ─── */
function Gallery() {
  const [ref, visible] = useInView();
  const cows = [
    { name: "Lakshmi", age: "5 yrs", status: "Sponsor",   img: "https://govardhangoushalakokan.com/wp-content/uploads/2025/06/goverdhan-0-421-1.jpg" },
    { name: "Ganga",   age: "8 yrs", status: "Sponsored", img: "https://govardhangoushalakokan.com/wp-content/uploads/2025/06/goverdhan-0-442-scaled.jpg" },
    { name: "Krishna", age: "2 yrs", status: "Sponsor",   img: "https://govardhangoushalakokan.com/wp-content/uploads/2025/06/goverdhan-0-421-2-scaled.jpg" },
    { name: "Nandini", age: "4 yrs", status: "Sponsor",   img: "https://govardhangoushalakokan.com/wp-content/uploads/2025/06/goverdhan-0-293-scaled.jpg" },
  ];

  const delays = ["", "reveal-d1", "reveal-d2", "reveal-d3"];

  return (
    <div className="gg-gallery-bg" id="cows">
      <div className="gg-section gg-gallery-section">
        <p className="gg-section-label">Meet Our Residents</p>
        <h2 className="gg-section-title">Our Beloved <em>Cows</em></h2>
        <p className="gg-section-body">Each cow has a story of rescue and resilience. Become a part of their journey by offering monthly sponsorship.</p>
        <div ref={ref} className="gg-gallery-grid">
          {cows.map((cow, i) => (
            <div key={cow.name} className={`gg-cow-card reveal ${delays[i]} ${visible ? "visible" : ""}`}>
              <div className="gg-cow-img">
                {visible && (
                  <Image
                    src={cow.img}
                    alt={cow.name}
                    fill
                    style={{ objectFit: "cover", objectPosition: "center" }}
                    sizes="(max-width: 768px) 50vw, 25vw"
                    unoptimized
                    onContextMenu={e => e.preventDefault()}
                  />
                )}
                <span className={`gg-cow-tag ${cow.status === "Sponsored" ? "sponsored" : ""}`}>
                  {cow.status === "Sponsored" ? "Sponsored ✓" : "Sponsor Me"}
                </span>
              </div>
              <div className="gg-cow-info">
                <div className="gg-cow-name">{cow.name}</div>
                <div className="gg-cow-age">{cow.age} old</div>
                {cow.status !== "Sponsored" && (
                  <button className="gg-cow-btn">
                    <Heart size={14} /> Sponsor {cow.name} <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Seva ─── */
function Seva() {
  const [ref, visible] = useInView();
  const items = [
    { Icon: Gift, title: "Gau Daan", price: "₹25,000+", desc: "Contribute towards rescuing and adopting a cow." },
    { Icon: Home, title: "Shed Construction", price: "₹50,000+", desc: "Help build safe, comfortable shelters." },
    { Icon: Stethoscope, title: "Medical Fund", price: "₹5,000+", desc: "Support veterinary care and treatments." },
    { Icon: HandHeart, title: "Volunteer Seva", price: "Your Time", desc: "Join us for hands-on seva days at the goshala." },
  ];
  const delays = ["", "reveal-d1", "reveal-d2", "reveal-d3"];
  return (
    <div className="gg-seva-bg" id="seva">
      <div className="gg-section">
        <p className="gg-section-label">Ways to Contribute</p>
        <h2 className="gg-section-title">Seva <em>Opportunities</em></h2>
        <div ref={ref} className="gg-seva-grid">
          {items.map((it, i) => (
            <div key={it.title} className={`gg-seva-card reveal ${delays[i]} ${visible ? "visible" : ""}`}>
              <div className="gg-seva-icon"><it.Icon size={22} /></div>
              <div className="gg-seva-name">{it.title}</div>
              <p className="gg-seva-desc">{it.desc}</p>
              <div className="gg-seva-price">{it.price}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── load Razorpay SDK once ─── */
function useRazorpayScript() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.Razorpay) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => setReady(true);
    document.body.appendChild(s);
  }, []);
  return ready;
}

/* ─── Donate ─── */
function Donate() {
  const [active, setActive] = useState(1500);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); // { type: "success"|"error", msg }
  const rzpReady = useRazorpayScript();

  const opts = [
    { amt: 500,   lbl: "Feed for a day" },
    { amt: 1500,  lbl: "Feed for a week" },
    { amt: 5000,  lbl: "Medical care" },
    { amt: 15000, lbl: "Monthly sponsor" },
  ];

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const handleDonate = useCallback(async () => {
    const amount = custom ? Number(custom) : active;
    if (!amount || amount < 1) {
      showToast("error", "Please select or enter a valid donation amount.");
      return;
    }
    if (!rzpReady) {
      showToast("error", "Payment gateway is loading. Please try again in a moment.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order creation failed.");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: "Govardhan Goshala",
        description: "Gau Seva Donation — गौ माता की सेवा",
        order_id: data.orderId,
        image: "/favicon.ico",
        theme: { color: "#1C3829" },
        prefill: { name: "", email: "", contact: "" },
        modal: {
          ondismiss: () => {
            setLoading(false);
            showToast("error", "Payment was cancelled. You can try again anytime.");
          },
        },
        handler: (response) => {
          setLoading(false);
          showToast(
            "success",
            `🙏 Thank you! Your donation of ₹${amount.toLocaleString("en-IN")} was received. Payment ID: ${response.razorpay_payment_id}`
          );
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => {
        setLoading(false);
        showToast("error", `Payment failed: ${resp.error.description}. Please try again.`);
      });
      rzp.open();
    } catch (err) {
      setLoading(false);
      showToast("error", err.message || "Something went wrong. Please try again.");
    }
  }, [active, custom, rzpReady, showToast]);

  return (
    <section className="gg-donate" id="donate">
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "success" ? "var(--forest)" : "#b91c1c",
          color: "#fff", padding: "14px 26px", borderRadius: 12, zIndex: 9998,
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)", fontSize: 14, maxWidth: "90vw",
          animation: "fadeInUp 0.3s ease", lineHeight: 1.5, textAlign: "center",
        }}>
          {toast.msg}
        </div>
      )}

      <div className="gg-section">
        <div className="gg-donate-inner">
          <p className="gg-section-label" style={{ textAlign: "center" }}>Support Our Mission</p>
          <h2 className="gg-section-title" style={{ textAlign: "center" }}>Every Rupee <em>Saves a Life</em></h2>
          <p style={{ textAlign: "center", color: "var(--stone)", marginTop: 14, lineHeight: 1.7 }}>
            Your contribution provides food, shelter, and medical care. All donations are eligible for <strong>80G tax benefits</strong>.
          </p>
          <div className="gg-donate-grid">
            {opts.map(o => (
              <button
                key={o.amt}
                className={`gg-donate-opt ${active === o.amt && !custom ? "active" : ""}`}
                onClick={() => { setActive(o.amt); setCustom(""); }}
              >
                <div className="amt">₹{o.amt.toLocaleString("en-IN")}</div>
                <div className="lbl">{o.lbl}</div>
              </button>
            ))}
          </div>
          <div className="gg-donate-custom">
            <input
              type="number"
              placeholder="Enter custom amount (₹)"
              className="gg-donate-input"
              value={custom}
              min="1"
              onChange={e => { setCustom(e.target.value); setActive(null); }}
            />
            <button
              className="gg-btn gg-btn-terra gg-btn-lg"
              style={{ whiteSpace: "nowrap", opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
              onClick={handleDonate}
              disabled={loading}
            >
              {loading
                ? <><span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Processing…</>
                : <><Heart size={18} /> Donate Now</>
              }
            </button>
          </div>
          <p className="gg-donate-note">🔒 Secured by Razorpay &nbsp;•&nbsp; 80G Tax Benefit &nbsp;•&nbsp; Instant receipt</p>
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ─── */
function Testimonials() {
  const [ref, visible] = useInView();
  const testi = [
    { name: "Rajesh Sharma", role: "Monthly Donor, Delhi", quote: "The care and devotion shown to each cow here is unlike anything I've witnessed. This goshala truly embodies gau seva in its most sacred form.", stars: 5 },
    { name: "Priya Patel", role: "Cow Sponsor, Mumbai", quote: "Sponsoring Lakshmi has been one of the most spiritually fulfilling decisions of my life. I receive monthly updates about her and it fills my heart with joy.", stars: 5 },
    { name: "Amit Kumar", role: "Volunteer, Mathura", quote: "I spent a weekend volunteering here and left a completely changed person. The cows are treated like family, with so much love and patience.", stars: 5 },
  ];
  return (
    <div className="gg-testi-bg">
      <div className="gg-section gg-testi-section">
        <p className="gg-section-label">What People Say</p>
        <h2 className="gg-section-title" style={{ color: "#fff" }}>Voices of Our <em style={{ color: "var(--amber)" }}>Community</em></h2>
        <div ref={ref} className="gg-testi-grid">
          {testi.map((t, i) => (
            <div key={t.name} className={`gg-testi-card reveal reveal-d${i} ${visible ? "visible" : ""}`}>
              <div className="gg-testi-stars">
                {Array.from({ length: t.stars }).map((_, j) => <Star key={j} size={14} fill="var(--amber)" color="var(--amber)" />)}
              </div>
              <p className="gg-testi-quote">&ldquo;{t.quote}&rdquo;</p>
              <div className="gg-testi-author">{t.name}</div>
              <div className="gg-testi-role">{t.role}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Contact ─── */
function Contact() {
  const [ref, visible] = useInView();
  return (
    <section className="gg-donate" id="contact">
      <div className="gg-section">
        <div ref={ref} className={`gg-contact-grid reveal ${visible ? "visible" : ""}`}>
          <div>
            <p className="gg-section-label">Find Us</p>
            <h2 className="gg-section-title">Visit Our <em>Sanctuary</em></h2>
            <p className="gg-section-body" style={{ marginBottom: 40 }}>
              We warmly welcome visitors who wish to experience the serenity and joy of gau seva. Come, spend time with the cows, and feel the peace of this sacred space.
            </p>
            <div className="gg-contact-item">
              <div className="gg-contact-icon"><MapPin size={18} /></div>
              <div>
                <div className="gg-contact-label">Address</div>
                <div className="gg-contact-val">Govardhan Goshala, Near Temple Road,<br />Mathura, Uttar Pradesh — 281121</div>
              </div>
            </div>
            <div className="gg-contact-item">
              <div className="gg-contact-icon"><Phone size={18} /></div>
              <div>
                <div className="gg-contact-label">Phone</div>
                <div className="gg-contact-val">+91 98765 43210</div>
              </div>
            </div>
            <div className="gg-contact-item">
              <div className="gg-contact-icon"><Mail size={18} /></div>
              <div>
                <div className="gg-contact-label">Email</div>
                <div className="gg-contact-val">info@govardhangoshala.org</div>
              </div>
            </div>
            <div className="gg-contact-item">
              <div className="gg-contact-icon"><Clock size={18} /></div>
              <div>
                <div className="gg-contact-label">Visiting Hours</div>
                <div className="gg-contact-val">Daily: 6:00 AM – 6:00 PM</div>
              </div>
            </div>
          </div>
          <div>
            <div style={{ background: "var(--cream-2)", borderRadius: 20, padding: 36 }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "var(--forest)", marginBottom: 24, fontWeight: 700 }}>
                Send a Message
              </h3>
              <form className="gg-form">
                <div className="gg-form-row">
                  <input type="text" placeholder="Your Name" className="gg-input" />
                  <input type="email" placeholder="Your Email" className="gg-input" />
                </div>
                <input type="tel" placeholder="Phone Number (optional)" className="gg-input" />
                <textarea placeholder="Your Message" className="gg-input gg-textarea" />
                <button type="submit" className="gg-btn gg-btn-forest" style={{ alignSelf: "flex-start", padding: "14px 28px", fontSize: 15 }}>
                  Send Message <ArrowRight size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  const { data: session } = useSession();
  return (
    <footer className="gg-footer">
      <div className="gg-footer-inner">
        <div className="gg-footer-grid">
          <div className="gg-footer-brand">
            <h2>Govardhan Goshala</h2>
            <p>A sanctuary of compassion for cows, rooted in the ancient tradition of gau seva. Every life here is a blessing.</p>
            <p style={{ marginTop: 16, color: "var(--amber)" }}>गौ माता की जय 🐄</p>
          </div>
          <div className="gg-footer-col">
            <h4>Explore</h4>
            <a href="#about">Our Story</a>
            <a href="#cows">Our Cows</a>
            <a href="#seva">Seva</a>
            <a href="#donate">Donate</a>
          </div>
          <div className="gg-footer-col">
            <h4>Contact</h4>
            <p>+91 98765 43210</p>
            <p>info@govardhangoshala.org</p>
            <p>Mathura, UP — 281121</p>
          </div>
          <div className="gg-footer-col">
            <h4>Timings</h4>
            <p>Mon – Sun</p>
            <p>6:00 AM – 6:00 PM</p>
            <p style={{ marginTop: 16, color: "rgba(255,255,255,0.35)", fontSize: 12 }}>80G Tax Benefits Available</p>
          </div>
        </div>
        <div className="gg-footer-bottom">
          <p className="gg-footer-copy">© {new Date().getFullYear()} Govardhan Goshala. All rights reserved. Made with ❤️ for the goshala community.</p>
          <Link href={session ? "/dashboard" : "/login"} className="gg-footer-staff">
            Staff Portal →
          </Link>
        </div>
      </div>
    </footer>
  );
}

/* ─── Main export ─── */
export default function HomePage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      <div className="gg-body gg-grain">
        <Nav />
        <main>
          <Hero />
          <StatsBand />
          <About />
          <Gallery />
          <Seva />
          <Donate />
          <Testimonials />
          <Contact />
        </main>
        <Footer />
      </div>
    </>
  );
}
