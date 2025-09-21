// src/pages/Landing.tsx
import React, { useState, useContext, useEffect } from 'react';
import { UserContext } from '../contexts/UserContext';
import {
  QuoteIcon,
  TamilNaduIcon,
  UsersIcon,
  PencilSquareIcon,
  UserIcon,
  UploadIcon,
  SparklesIcon,
  DownloadIcon,
  ChevronDownIcon,
  XMarkIcon,
  EnvelopeIcon,
  PhoneIcon,
} from '../components/icons';

type AuthMode = 'login' | 'signup' | 'forgotPassword' | 'updatePassword';

/* =========================
   THEME PRESETS
========================= */
type ThemeName = 'light' | 'dark';
const THEME: ThemeName = 'light';

const themes = {
  light: {
    page: 'bg-gradient-to-b from-indigo-100 via-indigo-50 to-slate-100',
    header: 'bg-indigo-100 border-b border-slate-200/70',
    brand: 'text-slate-900',
    heroWrap:
      'rounded-3xl bg-gradient-to-br from-indigo-50 via-white/80 to-violet-100 backdrop-blur-xl ring-1 ring-indigo-200 shadow-[0_20px_80px_-20px_rgba(79,70,229,0.25)]',
    h1: 'text-slate-900 drop-shadow-sm',
    h2: 'text-slate-800',
    body: 'text-slate-700',
    sub: 'text-slate-600',
    band: 'bg-indigo-100',
    card:
      'rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white/80 to-violet-50/70 ring-1 ring-slate-200 shadow-lg hover:shadow-2xl transition',
    softCard:
      'rounded-2xl bg-gradient-to-r from-white/90 to-indigo-50/90 ring-1 ring-slate-200 shadow-md',
    iconWrap: 'bg-gradient-to-tr from-indigo-100 to-violet-100 border border-indigo-200',
    primaryGrad: 'from-indigo-600 via-violet-600 to-fuchsia-600',
    ghost:
      'border border-indigo-200 bg-gradient-to-r from-white via-slate-50 to-indigo-50 text-slate-800 hover:shadow-md hover:scale-[1.02] active:scale-95 transition',
    ctaGrad: 'from-indigo-700 via-violet-600 to-fuchsia-600',
    sectionShadow: 'shadow-[0_30px_80px_-25px_rgba(30,41,59,0.2)]',
    line: 'from-transparent via-indigo-200 to-transparent',
    panel:
      'bg-gradient-to-br from-indigo-50 via-white to-violet-50 ring-1 ring-slate-200 shadow-lg',
  },
  dark: {
    page: 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900',
    header: 'bg-slate-900/80 border-slate-800',
    brand: 'text-slate-100',
    heroWrap:
      'rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-800/70 backdrop-blur-xl ring-1 ring-slate-700 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)]',
    h1: 'text-white',
    h2: 'text-white',
    body: 'text-slate-300',
    sub: 'text-slate-400',
    band: 'bg-slate-900',
    card:
      'rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 ring-1 ring-slate-700 shadow-md hover:shadow-2xl hover:ring-slate-600 transition',
    softCard: 'rounded-2xl bg-slate-900/80 ring-1 ring-slate-800 shadow-sm',
    iconWrap: 'bg-slate-800/90 border-2 border-slate-700',
    primaryGrad: 'from-indigo-500 via-violet-500 to-fuchsia-500',
    ghost:
      'border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-800 shadow-sm',
    ctaGrad: 'from-indigo-500 via-violet-500 to-fuchsia-500',
    sectionShadow: 'shadow-[0_30px_80px_-25px_rgba(0,0,0,0.6)]',
    line: 'from-transparent via-slate-800 to-transparent',
    panel: 'bg-slate-900 ring-1 ring-slate-800',
  },
} as const;

const t = themes[THEME];

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`border-b ${THEME === 'dark' ? 'border-slate-800' : 'border-slate-200'} py-4`}>
      <button
        className={`w-full flex justify-between items-center text-left text-lg font-semibold ${t.brand}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span>{question}</span>
        <ChevronDownIcon
          className={`h-6 w-6 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className={`mt-3 ${t.sub}`}>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
};

export default function Landing() {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, signup, sendPasswordResetEmail, updatePassword } = useContext(UserContext);

  const openModal = (mode: AuthMode) => {
    setAuthMode(mode);
    setIsModalOpen(true);
    setError(null);
    setSuccessMessage(null);
  };
  const closeModal = () => setIsModalOpen(false);

  // Safety: no default body margin
  useEffect(() => {
    const prev = document.body.style.margin;
    document.body.style.margin = '0';
    return () => {
      document.body.style.margin = prev;
    };
  }, []);

  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      openModal('updatePassword');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const { error } =
        authMode === 'login' ? await login(email, password) : await signup(email, password);
      if (error) {
        setError(error.message);
      } else if (authMode === 'signup') {
        setSuccessMessage('Success! Please check your email for a confirmation link.');
      } else {
        setIsModalOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const { error } = await sendPasswordResetEmail(email);
      if (error) setError(error.message);
      else setSuccessMessage('If an account exists for this email, a reset link has been sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(newPassword);
    if (error) {
      setError(error.message);
    } else {
      setSuccessMessage('Your password has been updated successfully! You can now log in.');
      setAuthMode('login');
      setNewPassword('');
      setConfirmPassword('');
      setPassword('');
    }
    setLoading(false);
  };

  const inputBase =
    'w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 transition';
  const inputRing =
    THEME === 'dark'
      ? 'border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-500 focus:ring-indigo-500 focus:border-indigo-500'
      : 'border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500';

  // Primary gradient buttons with BLACK text
  const primaryBtn =
    `inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl font-semibold
     shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-95
     ring-1 ring-indigo-400/40 transition-all duration-200 ease-in-out
     bg-gradient-to-r ${t.primaryGrad} text-black`;

  const ghostBtn =
    `h-12 px-7 rounded-xl border font-semibold
     shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95
     transition-all duration-200 ease-in-out ${t.ghost}`;

  const renderForm = () => {
    if (authMode === 'forgotPassword') {
      return (
        <>
          <h2 className={`text-2xl font-bold text-center ${t.h2} mb-6`}>Reset Your Password</h2>
          {successMessage ? (
            <p className="text-green-600 bg-green-50 p-4 rounded-md text-center">{successMessage}</p>
          ) : (
            <form onSubmit={handlePasswordReset}>
              <p className={`text-sm ${t.sub} mb-4 text-center`}>
                Enter your email and we'll send a reset link.
              </p>
              <div className="mb-4">
                <label htmlFor="email" className={`block text-sm font-medium mb-1 ${t.body}`}>
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${inputBase} ${inputRing}`}
                  required
                />
              </div>
              {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
              <button type="submit" disabled={loading} className={`${primaryBtn} w-full`}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
          <p className={`text-center text-sm ${t.sub} mt-6`}>
            Remember your password?
            <button
              onClick={() => setAuthMode('login')}
              className="font-semibold text-indigo-600 hover:text-indigo-500 ml-1 focus:outline-none"
            >
              Back to Login
            </button>
          </p>
        </>
      );
    }

    if (authMode === 'updatePassword') {
      return (
        <>
          <h2 className={`text-2xl font-bold text-center ${t.h2} mb-6`}>Update Your Password</h2>
          {successMessage ? (
            <div className="text-center">
              <p className="text-green-600 bg-green-50 p-4 rounded-md mb-4">{successMessage}</p>
              <button onClick={() => setAuthMode('login')} className={`${primaryBtn} w-full`}>
                Go to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword}>
              <p className={`text-sm ${t.sub} mb-4 text-center`}>
                Please enter your new password below.
              </p>
              <div className="mb-4">
                <label htmlFor="newPassword" className={`block text-sm font-medium mb-1 ${t.body}`}>
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`${inputBase} ${inputRing}`}
                  required
                />
              </div>
              <div className="mb-6">
                <label htmlFor="confirmPassword" className={`block text-sm font-medium mb-1 ${t.body}`}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`${inputBase} ${inputRing}`}
                  required
                />
              </div>
              {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
              <button type="submit" disabled={loading} className={`${primaryBtn} w-full`}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </>
      );
    }

    // login / signup
    return (
      <>
        <h2 className={`text-2xl font-bold text-center ${t.h2} mb-2`}>
          {authMode === 'login' ? 'Welcome Back!' : 'Get Started'}
        </h2>
        <p className={`${t.sub} text-center mb-6`}>
          {authMode === 'login' ? 'Login to access your dashboard.' : 'Create an account to start drafting.'}
        </p>

        {successMessage && authMode === 'signup' ? (
          <div className="text-center">
            <p className="text-green-600 bg-green-50 p-4 rounded-md mb-4">{successMessage}</p>
            <button onClick={closeModal} className={`${primaryBtn} w-full`}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className={`block text-sm font-medium mb-1 ${t.body}`}>
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${inputBase} ${inputRing}`}
                required
              />
            </div>
            <div className="mb-6">
              <label htmlFor="password" className={`block text-sm font-medium mb-1 ${t.body}`}>
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputBase} ${inputRing}`}
                required
              />
              {authMode === 'login' && (
                <div className="text-right mt-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode('forgotPassword')}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 focus:outline-none"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>
            {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
            <button type="submit" disabled={loading} className={`${primaryBtn} w-full`}>
              {loading ? 'Processing...' : authMode === 'login' ? 'Login' : 'Sign Up for Free'}
            </button>
          </form>
        )}

        <p className={`text-center text-sm ${t.sub} mt-6`}>
          {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          <button
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            className="font-semibold text-indigo-600 hover:text-indigo-500 ml-1 focus:outline-none"
          >
            {authMode === 'login' ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </>
    );
  };

  return (
    // FIXED full-viewport background to remove any top/bottom white gaps
    <div className={`fixed inset-0 overflow-y-auto ${t.page} font-sans flex flex-col`}>
      {/* Header */}
      <header className={`${t.header} sticky top-0 z-40`}>
        <div className="w-full max-w-screen-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <TamilNaduIcon className="h-8 w-8 text-indigo-600" />
            <span className={`text-lg font-semibold ${t.brand}`}>TN Sale Deed Assistant</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openModal('login')}
              className={`text-sm font-medium ${t.body} hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-md`}
            >
              Login
            </button>
            <button
              onClick={() => openModal('signup')}
              className="text-sm font-semibold py-1.5 px-4 rounded-lg shadow-md bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-black hover:brightness-110 transition focus:outline-none"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="w-full max-w-screen-2xl mx-auto px-6 sm:px-10 lg:px-14 flex-grow">
        {/* HERO */}
        <section className="pt-8 pb-10 sm:pt-10 sm:pb-12">
          <div className={`${t.heroWrap} ${t.sectionShadow} p-8 sm:p-12 text-center`}>
            <h1 className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${t.h1}`}>
              Draft Your Sale Deeds,{` `}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
                Instantly.
              </span>
            </h1>
            <p className={`mt-3 sm:mt-4 text-xl sm:text-2xl ${t.body}`}>
              உங்கள் விற்பனைப் பத்திரத்தை <span className="text-indigo-600 font-semibold">உடனடியாக</span> தயார் செய்யுங்கள்.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4">
              <button onClick={() => openModal('signup')} className={primaryBtn}>
                Get Started Free
              </button>
              <button onClick={() => openModal('login')} className={ghostBtn}>
                I already have an account
              </button>
            </div>
          </div>

          {/* divider line */}
          <div className="mt-10">
            <div className={`h-px w-full bg-gradient-to-r ${t.line}`} />
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-10">
          <h2 className={`text-3xl font-extrabold text-center mb-8 ${t.h2}`}>
            The Future of Sale Deed Drafting is Here
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Unmatched Accuracy',
                desc: 'Our system meticulously extracts information, drastically reducing the risk of manual errors and typos.',
              },
              {
                title: 'Blazing-Fast Turnaround',
                desc: 'Generate a complete first draft in a fraction of the time it takes to type one from scratch.',
              },
              {
                title: 'Secure & Confidential',
                desc: "We prioritize your data's security. All documents are handled with bank-level encryption and privacy.",
              },
              {
                title: 'Cost-Effective Solution',
                desc: 'Save valuable time and resources, allowing you to focus on your clients and core drafting work.',
              },
            ].map((f, i) => (
              <div key={i} className={`${t.card} p-6`}>
                <div className={`h-10 w-10 rounded-xl mb-4 grid place-items-center ${t.iconWrap}`}>
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${t.brand}`}>{f.title}</h3>
                <p className={`${t.sub}`}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* STEPS */}
        <section className="py-10">
          <h2 className={`text-3xl font-bold text-center mb-8 ${t.h2}`}>Get Started in 3 Simple Steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: '1. Upload Documents', desc: 'Provide the required source PDFs.', Icon: UploadIcon },
              { title: '2. Automated Processing', desc: 'Our system extracts and maps the data.', Icon: SparklesIcon },
              { title: '3. Review & Download', desc: 'Edit, copy, or download your new draft.', Icon: DownloadIcon },
            ].map(({ title, desc, Icon }, idx) => (
              <div key={idx} className={`${t.card} text-center p-8`}>
                <div className={`flex items-center justify-center h-16 w-16 mx-auto rounded-xl mb-4 ${t.iconWrap}`}>
                  <Icon className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className={`text-lg font-semibold mb-1 ${t.brand}`}>{title}</h3>
                <p className={`${t.sub}`}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* AUDIENCE */}
        <section className="py-10">
          <div className={`${t.softCard} p-8`}>
            <div className="text-center mb-8">
              <UsersIcon className="h-10 w-10 mx-auto text-indigo-600 mb-3" />
              <h2 className={`text-2xl font-bold ${t.h2}`}>Designed for Professionals and Individuals</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
              <div className={`${t.card} p-6`}>
                <PencilSquareIcon className={`h-8 w-8 mx-auto ${t.sub} mb-2`} />
                <h3 className={`font-semibold ${t.brand}`}>Document Writers</h3>
                <p className={`text-sm ${t.sub}`}>Eliminate tedious re-typing and focus on details.</p>
              </div>
              <div className={`${t.card} p-6`}>
                <UserIcon className={`h-8 w-8 mx-auto ${t.sub} mb-2`} />
                <h3 className={`font-semibold ${t.brand}`}>Individuals</h3>
                <p className={`text-sm ${t.sub}`}>Get a clear, understandable draft for your property needs.</p>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section className="py-10">
          <h2 className={`text-3xl font-bold ${t.h2} mb-8 text-center`}>
            Trusted by Professionals Across Tamil Nadu
          </h2>
          <div className="space-y-8 max-w-3xl mx-auto">
            <div className={`${t.card} p-8`}>
              <QuoteIcon className={`h-6 w-6 ${t.sub} mb-3`} />
              <p className={`italic ${t.body}`}>
                "As a document writer, speed is everything. This platform has doubled my output without
                compromising on quality. Highly recommended for its simplicity and power."
              </p>
              <p className={`mt-4 font-semibold text-right ${t.brand}`}>
                - S. Murugan, Professional Writer, Coimbatore
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-10 max-w-3xl mx-auto">
          <h2 className={`text-3xl font-bold ${t.h2} mb-6 text-center`}>Frequently Asked Questions</h2>
          <div className={`${t.card} p-6`}>
            <FAQItem
              question="Is my data secure?"
              answer="Absolutely. We use industry-leading encryption protocols to protect your documents. Your privacy and confidentiality are our top priorities. Files are processed securely and are not stored longer than necessary."
            />
            <FAQItem
              question="What kind of documents can I upload?"
              answer="The system is optimized for clear, scanned PDF documents. For best results, ensure the documents are upright, legible, and complete. Avoid using photos or documents with heavy handwritten notes."
            />
            <FAQItem
              question="Can I edit the generated draft?"
              answer="Yes. The final output is provided in a text editor where you can make any necessary adjustments or corrections before copying or downloading the final document."
            />
            <FAQItem
              question="How many free trials do I get?"
              answer="New users receive 15 free trials to experience the full power of the platform. After your trials are used, you can choose from our affordable plans to continue."
            />
          </div>
        </section>

        {/* CTA */}
        <section className="py-10">
          <div className={`rounded-3xl p-10 text-center shadow-xl bg-gradient-to-r ${t.ctaGrad} ${t.sectionShadow}`}>
            <h2 className="text-3xl font-bold text-white mb-3">Ready to Revolutionize Your Workflow?</h2>
            <p className="text-indigo-50/90 mb-6 max-w-2xl mx-auto">
              Create your account today and experience the fastest, most accurate way to draft sale deeds in Tamil Nadu.
            </p>
            <button
              onClick={() => openModal('signup')}
              className="inline-block bg-white text-indigo-700 font-bold py-3 px-8 rounded-xl shadow-lg hover:bg-slate-100 transition"
            >
              Sign Up for Free
            </button>
          </div>
        </section>

        {/* DISCLAIMER */}
        <section className="py-12">
          <div className={`${t.panel} rounded-2xl p-8 ${t.sectionShadow}`}>
            <h2 className={`text-3xl font-bold ${t.h2} mb-2 text-center`}>Disclaimer</h2>
            <p className={`${t.sub} text-center mb-6`}>Please read before using our site</p>
            <ul className={`list-disc space-y-3 ${t.body} max-w-3xl mx-auto pl-6`}>
              <li>
                <span className="font-semibold">You're Here on Your Own:</span> By using tnsaledeed.com, you agree
                that you came to our site to find information yourself, without any advertising or prompting from us.
              </li>
              <li>
                <span className="font-semibold">Information, Not Advice:</span> The content on this website is for
                general informational and educational purposes. It is not legal advice.
              </li>
              <li>
                <span className="font-semibold">We Are Not a Law Firm:</span> tnsaledeed.com does not offer legal,
                accounting, or auditing services. Our services and templates are tools to assist you, not to replace
                the guidance of a qualified lawyer or CA.
              </li>
              <li>
                <span className="font-semibold">Consult a Professional:</span> Laws related to property and sale deeds
                are complex and change often. We strongly recommend consulting a lawyer to ensure your documents are
                accurate and legally sound for your specific needs.
              </li>
              <li>
                <span className="font-semibold">No Guarantees:</span> We cannot guarantee that all information is
                100% accurate, up-to-date, or applicable in all legal jurisdictions.
              </li>
              <li>
                <span className="font-semibold">No Attorney-Client Relationship:</span> Your use of this site does not
                create a legal, professional, or attorney-client relationship between you and tnsaledeed.com.
              </li>
            </ul>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={`w-full py-12 mt-4 ${t.band}`}>
        <div className="w-full max-w-screen-2xl mx-auto px-6 text-center">
          <h3 className={`text-2xl font-bold ${t.h2} mb-6`}>Get in Touch</h3>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 mb-6">
            <a
              href="mailto:support@tnsaledeed.com"
              className={`flex items-center gap-2 text-lg hover:text-indigo-600 transition-colors ${t.body}`}
            >
              <EnvelopeIcon className="h-5 w-5" />
              <span>support@tnsaledeed.com</span>
            </a>
            <div className={`flex items-center gap-2 text-lg ${t.body}`}>
              <PhoneIcon className="h-5 w-5" />
              <span>+91 94897 21962 / +91 99629 01122</span>
            </div>
          </div>
          <p className={`text-sm ${t.sub}`}>&copy; {new Date().getFullYear()} Vitalize Ventures. All rights reserved.</p>
        </div>
      </footer>

      {/* AUTH MODAL */}
      {isModalOpen && (
        <div
          className={`fixed inset-0 ${THEME === 'dark' ? 'bg-black/70' : 'bg-slate-900/60'} backdrop-blur-sm flex justify-center items-center z-50 p-4`}
          onClick={closeModal}
        >
          <div
            className={`w-full max-w-sm ${t.panel} p-8 rounded-2xl ${t.sectionShadow} relative`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className={`absolute top-3 right-3 p-1 ${t.sub} rounded-full transition-colors`}
              aria-label="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>

            {renderForm()}

            <p className={`text-center text-xs ${t.sub} mt-8 px-4`}>
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
