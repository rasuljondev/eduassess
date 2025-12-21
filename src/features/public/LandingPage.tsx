import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../../shared/ui/Button';
import { useAlert } from '../../shared/ui/AlertProvider';
import { BackgroundMeteorsDots } from '../../shared/ui/background-meteors-dots';
import { LogIn, Shield, Award, Users, Clock, BarChart3, Mail, Phone, Sun, Moon } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Prefer explicit user choice, else fall back to current DOM state (set in main.tsx)
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return document.documentElement.classList.contains('dark');
  });
  
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);
  const { showError, showSuccess } = useAlert();

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const Reveal = ({
    children,
    className = '',
    delayMs = 0,
  }: {
    children: React.ReactNode;
    className?: string;
    delayMs?: number;
  }) => {
    const ref = useRef<HTMLDivElement | null>(null);
    const [shown, setShown] = useState(false);

    useEffect(() => {
      const el = ref.current;
      if (!el) return;

      const obs = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry?.isIntersecting) {
            setShown(true);
            obs.disconnect();
          }
        },
        { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
      );

      obs.observe(el);
      return () => obs.disconnect();
    }, []);

    return (
      <div
        ref={ref}
        className={`transform-gpu transition-all duration-700 ease-out ${
          shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        } ${className}`}
        style={{ transitionDelay: `${delayMs}ms` }}
      >
        {children}
      </div>
    );
  };

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 50;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Manage dark mode class on HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [isDarkMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      
      showSuccess('Login successful!');
      
      // Role-based redirect
      if (user?.role === 'SUPER_ADMIN') {
        navigate('/super');
      } else if (user?.role === 'CENTER_ADMIN') {
        navigate('/admin');
      } else if (user?.role === 'STUDENT') {
        navigate('/student');
      }
    } catch (err: any) {
      showError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const HeroBrand = () => {
    const fullLeft = 'Edu';
    const fullRight = 'Assess';

    const [spread, setSpread] = useState(false);
    const [leftText, setLeftText] = useState(fullLeft.slice(0, 1)); // "E"
    const [rightText, setRightText] = useState(fullRight.slice(0, 1)); // "A"

    useEffect(() => {
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

      if (prefersReduced) {
        setSpread(true);
        setLeftText(fullLeft);
        setRightText(fullRight);
        return;
      }

      const t1 = window.setTimeout(() => setSpread(true), 220); // show "EA" then spread

      let raf = 0;
      const charMs = 70; // faster + smoother
      const startTypingAt = performance.now() + 520;
      let lastL = 1;
      let lastR = 1;

      const tick = (now: number) => {
        if (now >= startTypingAt) {
          const elapsed = now - startTypingAt;
          const step = 1 + Math.floor(elapsed / charMs);

          const nextL = Math.min(fullLeft.length, step);
          const nextR = Math.min(fullRight.length, step);

          if (nextL !== lastL) {
            lastL = nextL;
            setLeftText(fullLeft.slice(0, nextL));
          }
          if (nextR !== lastR) {
            lastR = nextR;
            setRightText(fullRight.slice(0, nextR));
          }

          if (nextL >= fullLeft.length && nextR >= fullRight.length) {
            return; // done
          }
        }

        raf = window.requestAnimationFrame(tick);
      };

      raf = window.requestAnimationFrame(tick);

      return () => {
        window.clearTimeout(t1);
        if (raf) window.cancelAnimationFrame(raf);
      };
    }, []);

    return (
      <span className="relative inline-block align-middle">
        {/* Reserve final width so layout doesn't jump */}
        <span className="invisible whitespace-nowrap">
          <span className="text-gray-900 dark:text-white">Edu</span>{' '}
          <span className="text-blue-600 dark:text-blue-400">Assess</span>
        </span>

        <span className="absolute inset-0 flex items-center justify-center whitespace-nowrap">
          <span
            className={`inline-block text-gray-900 dark:text-white transition-transform duration-500 ease-out ${
              spread ? '-translate-x-3' : 'translate-x-0'
            }`}
          >
            {leftText}
          </span>

          <span
            className={`inline-block transition-[width] duration-500 ease-out ${
              spread ? 'w-2' : 'w-0'
            }`}
            aria-hidden="true"
          />

          <span
            className={`inline-block text-blue-600 dark:text-blue-400 transition-transform duration-500 ease-out ${
              spread ? 'translate-x-3' : 'translate-x-0'
            }`}
          >
            {rightText}
          </span>
        </span>
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-indigo-900/20 dark:to-purple-900/20 transition-colors duration-300">
      {/* AppBar/Menu Bar */}
      <header className={`w-full fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-4 sm:px-6 lg:px-8 ${scrolled ? 'pt-3' : 'pt-10'}`}>
        <div className="max-w-screen-2xl mx-auto">
          <div
            className={`mx-auto w-full transition-all duration-500 ease-out will-change-transform ${
              scrolled
                ? 'max-w-4xl rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 shadow-xl'
                : 'max-w-screen-2xl rounded-none bg-transparent border border-transparent shadow-none backdrop-blur-0'
            }`}
          >
            <div
              className={`flex items-center justify-between transition-all duration-300 ${
                scrolled ? 'h-12 px-2 sm:px-3' : 'h-16 px-4 sm:px-6'
              }`}
            >
            {/* Left: Logo + Nav (nav starts after logo) */}
            <div className={`flex items-center transition-all duration-300 ${scrolled ? 'gap-3' : 'gap-6'}`}>
              <div className="flex items-center shrink-0">
                <img
                  src="/logo_noback.png"
                  alt="EduAssess Logo"
                  className={`object-contain transition-all duration-300 ${scrolled ? 'h-8 w-8' : 'h-10 w-10'}`}
                />
              </div>

              <nav className={`hidden md:flex items-center transition-all duration-300 ${scrolled ? 'gap-1' : 'gap-4'}`}>
                <button
                  type="button"
                  onClick={() => scrollToId('home')}
                  className={`rounded-lg font-medium text-gray-700 hover:text-gray-900 hover:bg-white/60 dark:text-gray-200 dark:hover:text-white dark:hover:bg-gray-700/40 transition-all duration-300 ${
                    scrolled ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
                  }`}
                >
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => scrollToId('why-us')}
                  className={`rounded-lg font-medium text-gray-700 hover:text-gray-900 hover:bg-white/60 dark:text-gray-200 dark:hover:text-white dark:hover:bg-gray-700/40 transition-all duration-300 ${
                    scrolled ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
                  }`}
                >
                  Why Us?
                </button>
                <button
                  type="button"
                  onClick={() => scrollToId('contact-us')}
                  className={`rounded-lg font-medium text-gray-700 hover:text-gray-900 hover:bg-white/60 dark:text-gray-200 dark:hover:text-white dark:hover:bg-gray-700/40 transition-all duration-300 ${
                    scrolled ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
                  }`}
                >
                  Become Partner
                </button>
              </nav>
            </div>

            {/* Telegram + Dark Mode Toggle and Login Button */}
            <div className={`flex items-center shrink-0 transition-all duration-300 ${scrolled ? 'gap-2' : 'gap-6'}`}>
              <a
                href="https://t.me/rasuljon_developer"
                target="_blank"
                rel="noreferrer"
                className={`rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 ${
                  scrolled ? 'p-1' : 'p-2'
                }`}
                aria-label="Open Telegram @rasuljon_developer"
                title="Telegram: @rasuljon_developer"
              >
                <svg
                  viewBox="0 0 24 24"
                  width={scrolled ? 16 : 20}
                  height={scrolled ? 16 : 20}
                  aria-hidden="true"
                  className="text-[#229ED9]"
                  fill="currentColor"
                >
                  <path d="M21.94 2.32a1.5 1.5 0 0 0-1.67-.26L2.6 10.06a1.5 1.5 0 0 0 .14 2.8l4.7 1.7 1.83 5.87a1.5 1.5 0 0 0 2.48.67l2.74-2.69 4.93 3.62a1.5 1.5 0 0 0 2.35-.86l2.23-16.8a1.5 1.5 0 0 0-.06-.65ZM9.7 14.74l8.76-8.1c.2-.19.5.08.33.29l-6.94 9.22a1 1 0 0 0-.2.52l-.26 3.54-1.86-6.02a1 1 0 0 1 .17-1.45Z" />
                </svg>
              </a>
              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 ${
                  scrolled ? 'p-1' : 'p-2'
                }`}
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? (
                  <Sun className={`${scrolled ? 'w-4 h-4' : 'w-5 h-5'} text-yellow-500`} />
                ) : (
                  <Moon className={`${scrolled ? 'w-4 h-4' : 'w-5 h-5'} text-gray-700 dark:text-gray-300`} />
                )}
              </button>

              <Button
              size={scrolled ? "sm" : "md"}
              color="blue"
              onClick={() => navigate('/login')}
              leftIcon={<LogIn className="w-4 h-4" />}
              customClassName={`transition-all duration-300 ${
                scrolled 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 px-2.5 py-1.5' 
                  : 'bg-blue-600/80 text-white hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              Login
            </Button>
            </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {/* Hero should cover at least a full laptop viewport; header is fixed, so add top padding */}
      <BackgroundMeteorsDots className="flex-1 flex items-center justify-center relative overflow-hidden min-h-screen pt-28 sm:pt-32">
        {/* Hero Content */}
        <div id="home" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 text-center scroll-mt-28">
          <div className="mb-8">
            <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6 transition-colors">
              <HeroBrand />
            </h1>
            <p className="text-xl lg:text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed transition-colors">
              Professional & Universal Mock Exam Platform
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed transition-colors">
              Prepare with purpose. Perform with confidence.
            </p>
            <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed transition-colors">
              Mock tests help you understand your readiness and approach the real exam with clarity.
            </p>
          </div>

          {showLogin && (
            <div className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-auto transition-colors">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center transition-colors">Welcome Back</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                    Login
                  </label>
                  <input
                    type="text"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter login (e.g. test_ielts_ab12c) or email"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  color="blue"
                  isLoading={loading}
                  leftIcon={<LogIn className="w-5 h-5" />}
                >
                  Sign In
                </Button>
                <button
                  type="button"
                  onClick={() => setShowLogin(false)}
                  className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}
        </div>
      </BackgroundMeteorsDots>

      {/* Why Choose Us Section */}
      <section id="why-us" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900 transition-colors scroll-mt-24">
        <div className="max-w-7xl mx-auto">
          <Reveal delayMs={0}>
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
                Why Choose Us
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto transition-colors">
                Experience the difference with our comprehensive exam platform
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Reveal delayMs={0}>
              <div className="p-6 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">Secure Platform</h3>
                <p className="text-gray-600 dark:text-gray-300 transition-colors">
                  Your data and exam results are protected with enterprise-grade security measures.
                </p>
              </div>
            </Reveal>

            <Reveal delayMs={80}>
              <div className="p-6 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">Certified Exams</h3>
                <p className="text-gray-600 dark:text-gray-300 transition-colors">
                  Practice with official exam formats and get certified for your achievements.
                </p>
              </div>
            </Reveal>

            <Reveal delayMs={160}>
              <div className="p-6 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">Multi-Center Support</h3>
                <p className="text-gray-600 dark:text-gray-300 transition-colors">
                  Connect with multiple educational centers and access diverse exam resources.
                </p>
              </div>
            </Reveal>

            <Reveal delayMs={0}>
              <div className="p-6 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">Flexible Timing</h3>
                <p className="text-gray-600 dark:text-gray-300 transition-colors">
                  Take exams at your convenience with 24/7 access to our platform.
                </p>
              </div>
            </Reveal>

            <Reveal delayMs={80}>
              <div className="p-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">Progress Tracking</h3>
                <p className="text-gray-600 dark:text-gray-300 transition-colors">
                  Monitor your performance with detailed analytics and progress reports.
                </p>
              </div>
            </Reveal>

            <Reveal delayMs={160}>
              <div className="p-6 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-4">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">Detailed Feedback</h3>
                <p className="text-gray-600 dark:text-gray-300 transition-colors">
                  Receive comprehensive feedback after each exam to improve your performance.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact-us" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800 transition-colors scroll-mt-24">
        <div className="max-w-7xl mx-auto">
          <Reveal delayMs={0}>
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
                Contact Us
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto transition-colors">
                Get in touch with us for any questions or support
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-12">
            <Reveal delayMs={0}>
              <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 transition-colors">Get in Touch</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1 transition-colors">Email</h4>
                    <p className="text-gray-600 dark:text-gray-300 transition-colors">rasuljon8218@gmail.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1 transition-colors">Phone</h4>
                    <p className="text-gray-600 dark:text-gray-300 transition-colors">+998992200880</p>
                  </div>
                </div>
              </div>
              </div>
            </Reveal>

            <Reveal delayMs={120}>
              <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 transition-colors">Send us a Message</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 transition-colors">
                This form will send messages to our Telegram bot later (coming soon).
              </p>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  showSuccess('Coming soon! We will connect this form to Telegram bot later.');
                }}
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="your.email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                    Message
                  </label>
                  <textarea
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                    placeholder="Your message..."
                  ></textarea>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  color="blue"
                  fullWidth
                  customClassName="bg-blue-600 text-white hover:bg-blue-700"
                >
                  Send Message
                </Button>
              </form>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Reveal delayMs={0} className="border-t border-gray-800 py-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 EduAssess. All rights reserved.</p>
          </Reveal>
        </div>
      </footer>
    </div>
  );
};
