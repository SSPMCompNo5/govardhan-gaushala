"use client";

import { useState, useEffect, useRef, memo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Heart,
  Users,
  Shield,
  Leaf,
  Phone,
  Mail,
  MapPin,
  Clock,
  ChevronDown,
  ArrowRight,
  Star,
  Menu,
  X,
  Sun,
  Moon,
  Sparkles,
  HandHeart,
  Home,
  Stethoscope,
  Gift
} from "lucide-react";

// Lightweight intersection observer hook with caching
function useInView(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const current = ref.current;
    if (!current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Stop observing once visible
        }
      },
      { threshold, rootMargin: '50px' }
    );

    observer.observe(current);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isVisible];
}

// Optimized Animated Counter - only animates once
const AnimatedCounter = memo(function AnimatedCounter({ end, suffix = "" }) {
  const [count, setCount] = useState(0);
  const [ref, isVisible] = useInView();
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isVisible || hasAnimated.current) return;
    hasAnimated.current = true;

    const duration = 1500;
    const steps = 30;
    const increment = end / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isVisible, end]);

  return <span ref={ref}>{count}{suffix}</span>;
});

// Memoized Navigation Component
const Navigation = memo(function Navigation({ isDark, setIsDark }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 50);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: "#about", label: "About" },
    { href: "#gallery", label: "Our Cows" },
    { href: "#seva", label: "Seva" },
    { href: "#contact", label: "Contact" },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
        ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-md'
        : 'bg-transparent'
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl lg:text-2xl">🐄</span>
            </div>
            <div className="hidden sm:block">
              <h1 className={`font-bold text-lg lg:text-xl ${isScrolled ? 'text-gray-900 dark:text-white' : 'text-white'
                }`}>
                Govardhan Goshala
              </h1>
              <p className={`text-xs ${isScrolled ? 'text-emerald-600' : 'text-emerald-200'
                }`}>
                गौ सेवा • Cow Sanctuary
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`font-medium hover:text-emerald-500 ${isScrolled ? 'text-gray-700 dark:text-gray-200' : 'text-white/90'
                  }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-lg ${isScrolled
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                  : 'hover:bg-white/10 text-white'
                }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="hidden sm:flex items-center gap-3">
              <a href="#donate">
                <Button variant="outline" size="sm" className={`${isScrolled
                    ? 'border-emerald-600 text-emerald-600 hover:bg-emerald-50'
                    : 'border-white text-white hover:bg-white/10'
                  }`}>
                  Donate
                </Button>
              </a>
              <Link href={session ? "/dashboard" : "/login"}>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {session ? "Dashboard" : "Staff Login"}
                </Button>
              </Link>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`lg:hidden p-2 rounded-lg ${isScrolled
                  ? 'text-gray-700 dark:text-gray-200'
                  : 'text-white'
                }`}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-gray-900 border-t dark:border-gray-800 px-4 py-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-gray-700 dark:text-gray-200 hover:text-emerald-600 font-medium"
            >
              {link.label}
            </a>
          ))}
          <div className="flex gap-3 pt-3 border-t dark:border-gray-800 mt-3">
            <a href="#donate" className="flex-1">
              <Button variant="outline" className="w-full border-emerald-600 text-emerald-600">
                Donate
              </Button>
            </a>
            <Link href={session ? "/dashboard" : "/login"} className="flex-1">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                {session ? "Dashboard" : "Login"}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
});

// Hero Section - Optimized with CSS background
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900">
      {/* Optimized Background - Using CSS gradient instead of heavy image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url('https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=1200&q=60')`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-amber-200 text-sm font-medium">ॐ गाँ गौमात्रे नमः</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white">
            Protecting Sacred Lives
          </h1>

          {/* Subtitle */}
          <p className="text-xl sm:text-2xl text-emerald-300 font-medium">
            गौ माता की सेवा में समर्पित
          </p>

          {/* Description */}
          <p className="max-w-2xl mx-auto text-lg text-gray-200">
            Join us in our mission to provide shelter, care, and love to abandoned and rescued cows.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a href="#donate">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg shadow-xl">
                <Heart className="w-5 h-5 mr-2" />
                Donate Now
              </Button>
            </a>
            <a href="#about">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg">
                Learn More
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <a href="#about" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 hover:text-white animate-bounce">
        <ChevronDown className="w-8 h-8" />
      </a>
    </section>
  );
}

// About Section - Simplified
const AboutSection = memo(function AboutSection() {
  const [ref, isVisible] = useInView();

  const values = [
    { icon: Heart, title: "Compassion", desc: "Love and care for every cow" },
    { icon: Shield, title: "Protection", desc: "Rescuing abandoned cows" },
    { icon: Leaf, title: "Sustainability", desc: "Organic and sustainable practices" },
    { icon: Users, title: "Community", desc: "Educating and inspiring others" }
  ];

  return (
    <section id="about" className="py-20 bg-gradient-to-b from-white to-emerald-50/50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={`grid lg:grid-cols-2 gap-12 items-center transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'
            }`}
        >
          {/* Content */}
          <div className="space-y-6">
            <span className="inline-block px-4 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium">
              About Govardhan Goshala
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              A Sacred Shelter for <span className="text-emerald-600">Divine Mothers</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Established with a vision to protect and serve cows, Govardhan Goshala has been
              a sanctuary of love and care. We rescue, rehabilitate, and provide
              lifelong care to abandoned, injured, and elderly cows.
            </p>

            {/* Values Grid */}
            <div className="grid grid-cols-2 gap-4">
              {values.map((value) => (
                <div key={value.title} className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <value.icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{value.title}</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{value.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Image - Using optimized placeholder */}
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-xl bg-gray-200 dark:bg-gray-700">
              <img
                src="https://images.unsplash.com/photo-1527153857715-3908831b905d?w=600&q=70"
                alt="Cows at Goshala"
                className="w-full h-80 object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

// Stats Section - Optimized
const StatsSection = memo(function StatsSection() {
  const stats = [
    { value: 500, suffix: "+", label: "Cows Protected", icon: "🐄" },
    { value: 150, suffix: "+", label: "Rescued This Year", icon: "🛡️" },
    { value: 75, suffix: "+", label: "Cows Adopted", icon: "❤️" },
    { value: 10, suffix: "+", label: "Years of Service", icon: "🏆" },
  ];

  return (
    <section className="py-16 bg-gradient-to-r from-emerald-600 to-emerald-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">Our Impact in Numbers</h2>
          <p className="text-emerald-100">Every number represents a life saved</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-bold text-white">
                <AnimatedCounter end={stat.value} suffix={stat.suffix} />
              </div>
              <p className="text-emerald-100 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

// Gallery Section - Lazy loaded images
const GallerySection = memo(function GallerySection() {
  const [ref, isVisible] = useInView();

  const cows = [
    { name: "Lakshmi", age: "5 years", status: "Sponsor", image: "photo-1527153857715-3908831b905d" },
    { name: "Ganga", age: "8 years", status: "Sponsored", image: "photo-1570042225831-d98fa7577f1e" },
    { name: "Krishna", age: "2 years", status: "Sponsor", image: "photo-1596733430284-f7437764b1a9" },
    { name: "Nandini", age: "4 years", status: "Sponsor", image: "photo-1564466809058-bf4114d55352" },
  ];

  return (
    <section id="gallery" className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium mb-4">
            Meet Our Residents
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Our Beloved Cows
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
            Each cow has a unique story. Sponsor one today and become a part of their journey.
          </p>
        </div>

        <div
          ref={ref}
          className={`grid sm:grid-cols-2 lg:grid-cols-4 gap-6 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'
            }`}
        >
          {cows.map((cow) => (
            <Card key={cow.name} className="overflow-hidden bg-white dark:bg-gray-800 border-0 shadow-lg">
              <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
                {isVisible && (
                  <img
                    src={`https://images.unsplash.com/${cow.image}?w=400&q=60`}
                    alt={cow.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                <span className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${cow.status === 'Sponsored' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                  }`}>
                  {cow.status === 'Sponsored' ? 'Sponsored' : 'Sponsor Me'}
                </span>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{cow.name}</h3>
                  <span className="text-sm text-gray-500">{cow.age}</span>
                </div>
                {cow.status !== 'Sponsored' && (
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
                    <Heart className="w-4 h-4 mr-2" />
                    Sponsor
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
});

// Donate Section - Simplified
const DonateSection = memo(function DonateSection() {
  const [ref, isVisible] = useInView();

  const options = [
    { amount: 500, label: "Feed for a day", icon: "🌾" },
    { amount: 1500, label: "Feed for a week", icon: "🥬" },
    { amount: 5000, label: "Medical care", icon: "💊" },
    { amount: 15000, label: "Monthly sponsor", icon: "❤️" },
  ];

  return (
    <section id="donate" className="py-20 bg-white dark:bg-gray-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={`text-center transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          <span className="inline-block px-4 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium mb-4">
            Support Our Mission
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Every Donation <span className="text-emerald-600">Saves Lives</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-xl mx-auto mb-10">
            Your contribution helps us provide food, shelter, and medical care.
            All donations are eligible for 80G tax benefits.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {options.map((opt) => (
              <button
                key={opt.amount}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-2 border-transparent hover:border-emerald-500 transition-colors text-left"
              >
                <span className="text-2xl block mb-2">{opt.icon}</span>
                <p className="text-xl font-bold text-gray-900 dark:text-white">₹{opt.amount.toLocaleString()}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{opt.label}</p>
              </button>
            ))}
          </div>

          <div className="flex gap-4 max-w-md mx-auto">
            <input
              type="number"
              placeholder="Custom amount"
              className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
            />
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8">
              Donate
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
});

// Seva Section - Simplified
const SevaSection = memo(function SevaSection() {
  const sevas = [
    { icon: Gift, title: "Gau Daan", price: "₹25,000+", desc: "Donate towards cow rescue" },
    { icon: Home, title: "Shed Construction", price: "₹50,000+", desc: "Build comfortable shelters" },
    { icon: Stethoscope, title: "Medical Fund", price: "₹5,000+", desc: "Support medical treatments" },
    { icon: HandHeart, title: "Volunteer", price: "Your Time", desc: "Join us for seva day" },
  ];

  return (
    <section id="seva" className="py-20 bg-gradient-to-b from-emerald-50 to-white dark:from-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-medium mb-4">
            Ways to Contribute
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Seva Opportunities
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sevas.map((seva) => (
            <div key={seva.title} className="relative p-6 pt-10 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 text-center">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <seva.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{seva.title}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{seva.desc}</p>
              <p className="text-emerald-600 font-bold">{seva.price}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

// Testimonials - Simplified
const TestimonialsSection = memo(function TestimonialsSection() {
  const testimonials = [
    { name: "Rajesh Sharma", role: "Monthly Donor", quote: "The love and care they provide to each cow is truly inspiring.", rating: 5 },
    { name: "Priya Patel", role: "Cow Sponsor", quote: "Sponsoring Lakshmi has been one of the most fulfilling decisions of my life.", rating: 5 },
    { name: "Amit Kumar", role: "Volunteer", quote: "The cows are treated like family members. This is gau seva in its truest form.", rating: 5 },
  ];

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">What Our Supporters Say</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
              <div className="flex gap-1 mb-3">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-gray-600 dark:text-gray-300 italic mb-4">"{t.quote}"</p>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{t.name}</p>
                <p className="text-sm text-emerald-600">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

// Contact Section - Simplified
const ContactSection = memo(function ContactSection() {
  return (
    <section id="contact" className="py-20 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Visit Our Sanctuary</h2>
            <p className="text-gray-600 dark:text-gray-300">
              We welcome visitors who wish to experience the joy of gau seva.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Address</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Govardhan Goshala, Near Temple Road, Mathura, UP - 281121</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <Phone className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Phone</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">+91 98765 43210</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <Clock className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Hours</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Daily: 6:00 AM - 6:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Send a Message</h3>
            <form className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                />
                <input
                  type="email"
                  placeholder="Your Email"
                  className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                />
              </div>
              <textarea
                placeholder="Your Message"
                rows={4}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white resize-none"
              />
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5">
                Send Message
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
});

// Footer - Simplified
function Footer() {
  const { data: session } = useSession();

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center">
                <span className="text-xl">🐄</span>
              </div>
              <div>
                <h3 className="font-bold">Govardhan Goshala</h3>
                <p className="text-emerald-400 text-xs">गौ सेवा • Cow Sanctuary</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              Dedicated to the protection and care of cows.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#about" className="hover:text-emerald-400">About</a></li>
              <li><a href="#gallery" className="hover:text-emerald-400">Our Cows</a></li>
              <li><a href="#donate" className="hover:text-emerald-400">Donate</a></li>
              <li><a href="#contact" className="hover:text-emerald-400">Contact</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>+91 98765 43210</li>
              <li>info@govardhangoshala.org</li>
              <li>Mathura, UP - 281121</li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-semibold mb-4">Stay Updated</h4>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">© {new Date().getFullYear()} Govardhan Goshala. All rights reserved.</p>
          <Link href={session ? "/dashboard" : "/login"} className="text-emerald-400 hover:text-emerald-300 text-sm">
            Staff Portal →
          </Link>
        </div>
      </div>
    </footer>
  );
}

// Main Homepage Component
export default function HomePage() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check system preference once on mount
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navigation isDark={isDark} setIsDark={setIsDark} />
      <HeroSection />
      <AboutSection />
      <StatsSection />
      <GallerySection />
      <DonateSection />
      <SevaSection />
      <TestimonialsSection />
      <ContactSection />
      <Footer />
    </div>
  );
}
