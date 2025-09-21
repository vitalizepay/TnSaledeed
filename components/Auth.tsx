import React, { useState, useContext, useEffect } from 'react';
import { UserContext } from '../contexts/UserContext';
import { QuoteIcon, TamilNaduIcon, UsersIcon, BriefcaseIcon, PencilSquareIcon, UserIcon, UploadIcon, SparklesIcon, DownloadIcon, ChevronDownIcon, XMarkIcon, EnvelopeIcon, PhoneIcon } from './icons';

type AuthMode = 'login' | 'signup' | 'forgotPassword' | 'updatePassword';

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-slate-200 py-4">
            <button
                className="w-full flex justify-between items-center text-left text-lg font-semibold text-slate-800"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <span>{question}</span>
                <ChevronDownIcon className={`h-6 w-6 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="mt-3 text-slate-600">
                    <p>{answer}</p>
                </div>
            )}
        </div>
    );
};

export const Auth: React.FC = () => {
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
      const { error } = authMode === 'login' ? await login(email, password) : await signup(email, password);
      if (error) {
        setError(error.message);
      } else if (authMode === 'signup') {
        setSuccessMessage("Success! Please check your email for a confirmation link.");
      }
    } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError('An unexpected error occurred.');
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
      else setSuccessMessage("If an account exists for this email, a password reset link has been sent.");
    } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError('An unexpected error occurred.');
    } finally {
        setLoading(false);
    }
  };
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
        setError("Password should be at least 6 characters.");
        return;
    }
    setLoading(true);
    const { error } = await updatePassword(newPassword);
    if (error) {
      setError(error.message);
    } else {
      setSuccessMessage("Your password has been updated successfully! You can now log in.");
      setAuthMode('login');
      setNewPassword('');
      setConfirmPassword('');
      setPassword('');
    }
    setLoading(false);
  };
  const renderForm = () => {
    if (authMode === 'forgotPassword') {
      return (
        <>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Reset Your Password</h2>
          {successMessage ? (
              <p className="text-green-600 bg-green-50 p-4 rounded-md text-center">{successMessage}</p>
          ) : (
          <form onSubmit={handlePasswordReset}>
              <p className="text-sm text-slate-600 mb-4 text-center">Enter your email and we'll send a reset link.</p>
              <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
              </div>
              {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300 disabled:bg-slate-400 disabled:cursor-wait focus:outline-none focus:ring-4 focus:ring-blue-300">
                  {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
          </form>
          )}
            <p className="text-center text-sm text-slate-500 mt-6">
              Remember your password?
              <button onClick={() => setAuthMode('login')} className="font-semibold text-blue-600 hover:text-blue-500 ml-1 focus:outline-none">Back to Login</button>
            </p>
        </>
      );
    }
    if (authMode === 'updatePassword') {
      return (
        <>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Update Your Password</h2>
          {successMessage ? (
              <div className="text-center">
                  <p className="text-green-600 bg-green-50 p-4 rounded-md mb-4">{successMessage}</p>
                  <button onClick={() => setAuthMode('login')} className="w-full bg-blue-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300">
                      Go to Login
                  </button>
              </div>
          ) : (
          <form onSubmit={handleUpdatePassword}>
              <p className="text-sm text-slate-600 mb-4 text-center">Please enter your new password below.</p>
              <div className="mb-4">
                  <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                  <input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
              </div>
              <div className="mb-6">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                  <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
              </div>
              {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300 disabled:bg-slate-400 disabled:cursor-wait focus:outline-none focus:ring-4 focus:ring-blue-300">
                  {loading ? 'Updating...' : 'Update Password'}
              </button>
          </form>
          )}
        </>
      );
    }
    
    return (
        <>
            <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
              {authMode === 'login' ? 'Welcome Back!' : 'Get Started'}
            </h2>
            <p className="text-slate-600 text-center mb-6">{authMode === 'login' ? 'Login to access your dashboard.' : 'Create an account to start drafting.'}</p>
            {successMessage && authMode === 'signup' ? (
                <div className="text-center">
                    <p className="text-green-600 bg-green-50 p-4 rounded-md mb-4">{successMessage}</p>
                     <button onClick={closeModal} className="w-full bg-blue-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300">
                     Close
                    </button>
                </div>
            ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
              </div>
              <div className="mb-6">
                  <label htmlFor="password"className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                  {authMode === 'login' && (
                      <div className="text-right mt-2">
                          <button type="button" onClick={() => setAuthMode('forgotPassword')} className="text-sm font-semibold text-blue-600 hover:text-blue-500 focus:outline-none">
                            Forgot Password?
                          </button>
                      </div>
                  )}
              </div>
              {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300 disabled:bg-slate-400 disabled:cursor-wait focus:outline-none focus:ring-4 focus:ring-blue-300">
                  {loading ? 'Processing...' : (authMode === 'login' ? 'Login' : 'Sign Up for Free')}
              </button>
            </form>
            )}
            <p className="text-center text-sm text-slate-500 mt-6">
              {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="font-semibold text-blue-600 hover:text-blue-500 ml-1 focus:outline-none">
                  {authMode === 'login' ? 'Sign Up' : 'Login'}
              </button>
            </p>
        </>
    );
  };
  
  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/80">
        <div className="w-full max-w-screen-2xl mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <TamilNaduIcon className="h-8 w-8 text-blue-600" />
                <span className="text-lg font-semibold text-slate-800">TN Sale Deed Assistant</span>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => openModal('login')} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-md">
                    Login
                </button>
                <button onClick={() => openModal('signup')} className="bg-blue-600 text-white text-sm font-semibold py-1.5 px-4 rounded-lg shadow-sm hover:bg-blue-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2">
                    Sign Up
                </button>
            </div>
        </div>
      </header>
      <main className="w-full max-w-screen-2xl mx-auto px-6 py-12 sm:px-12 lg:px-16 flex-grow">
          <section className="text-center mb-20">
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-tight">Draft Your Sale Deeds, <span className="text-blue-600">Instantly.</span></h1>
              <p className="text-lg text-slate-600 mb-8 max-w-3xl mx-auto">
                  The definitive platform for document writers and individuals in Tamil Nadu. Convert your existing documents into perfectly formatted, ready-to-register drafts in minutes, not hours.
              </p>
               <button onClick={() => openModal('signup')} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300">
                  Start Your First Draft
               </button>
          </section>
          <section className="mb-20">
              <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">The Future of Sale Deed Drafting is Here</h2>
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="bg-slate-50 p-6 rounded-lg border border-slate-200/80">
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">Unmatched Accuracy</h3>
                      <p className="text-slate-600">Our system meticulously extracts information, drastically reducing the risk of manual errors and typos.</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-lg border border-slate-200/80">
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">Blazing-Fast Turnaround</h3>
                      <p className="text-slate-600">Generate a complete first draft in a fraction of the time it takes to type one from scratch.</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-lg border border-slate-200/80">
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">Secure & Confidential</h3>
                      <p className="text-slate-600">We prioritize your data's security. All documents are handled with bank-level encryption and privacy.</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-lg border border-slate-200/80">
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">Cost-Effective Solution</h3>
                      <p className="text-slate-600">Save valuable time and resources, allowing you to focus on your clients and core drafting work.</p>
                  </div>
              </div>
          </section>
          <section className="mb-20">
              <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">Get Started in 3 Simple Steps</h2>
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="text-center flex-1">
                      <div className="flex items-center justify-center h-16 w-16 mx-auto bg-blue-100 rounded-full mb-4 border-2 border-blue-200/80">
                          <UploadIcon className="h-8 w-8 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-1">1. Upload Documents</h3>
                      <p className="text-slate-600">Provide the required source PDFs.</p>
                  </div>
                  <div className="text-center flex-1">
                      <div className="flex items-center justify-center h-16 w-16 mx-auto bg-blue-100 rounded-full mb-4 border-2 border-blue-200/80">
                          <SparklesIcon className="h-8 w-8 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-1">2. Automated Processing</h3>
                      <p className="text-slate-600">Our system extracts and maps the data.</p>
                  </div>
                  <div className="text-center flex-1">
                      <div className="flex items-center justify-center h-16 w-16 mx-auto bg-blue-100 rounded-full mb-4 border-2 border-blue-200/80">
                          <DownloadIcon className="h-8 w-8 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-1">3. Review & Download</h3>
                      <p className="text-slate-600">Edit, copy, or download your new draft.</p>
                  </div>
              </div>
          </section>
          <section className="mb-20">
              <div className="bg-slate-50/80 p-8 rounded-lg border border-slate-200/80">
                  <div className="text-center mb-8">
                      <UsersIcon className="h-10 w-10 mx-auto text-blue-600 mb-3" />
                      <h2 className="text-2xl font-bold text-slate-900">Designed for Professionals and Individuals</h2>
                  </div>
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 text-center">
                      <div>
                          <PencilSquareIcon className="h-8 w-8 mx-auto text-slate-600 mb-2"/>
                          <h3 className="font-semibold text-slate-800">Document Writers</h3>
                          <p className="text-sm text-slate-600">Eliminate tedious re-typing and focus on details.</p>
                      </div>
                      <div>
                          <UserIcon className="h-8 w-8 mx-auto text-slate-600 mb-2"/>
                          <h3 className="font-semibold text-slate-800">Individuals</h3>
                          <p className="text-sm text-slate-600">Get a clear, understandable draft for your property needs.</p>
                      </div>
                  </div>
              </div>
          </section>
          <section className="mb-20">
              <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Trusted by Professionals Across Tamil Nadu</h2>
              <div className="space-y-8 w-full max-w-3xl mx-auto">
                  <div className="bg-white p-6 rounded-lg border border-slate-200">
                      <QuoteIcon className="h-6 w-6 text-slate-300 mb-3" />
                      <p className="italic text-slate-700">"As a document writer, speed is everything. This platform has doubled my output without compromising on quality. Highly recommended for its simplicity and power."</p>
                      <p className="mt-4 font-semibold text-right text-slate-800">- S. Murugan, Professional Writer, Coimbatore</p>
                  </div>
              </div>
          </section>
          <section className="mb-20 w-full max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-slate-900 mb-6 text-center">Frequently Asked Questions</h2>
              <FAQItem question="Is my data secure?" answer="Absolutely. We use industry-leading encryption protocols to protect your documents. Your privacy and confidentiality are our top priorities. Files are processed securely and are not stored longer than necessary." />
              <FAQItem question="What kind of documents can I upload?" answer="The system is optimized for clear, scanned PDF documents. For best results, ensure the documents are upright, legible, and complete. Avoid using photos or documents with heavy handwritten notes." />
              <FAQItem question="Can I edit the generated draft?" answer="Yes. The final output is provided in a text editor where you can make any necessary adjustments or corrections before copying or downloading the final document." />
              <FAQItem question="How many free trials do I get?" answer="New users receive 15 free trials to experience the full power of the platform. After your trials are used, you can choose from our affordable plans to continue." />
          </section>
          <section className="text-center bg-blue-600 text-white p-10 rounded-lg w-full max-w-xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">Ready to Revolutionize Your Workflow?</h2>
              <p className="text-blue-200 mb-6 max-w-xl mx-auto">Create your account today and experience the fastest, most accurate way to draft sale deeds in Tamil Nadu.</p>
              <button onClick={() => openModal('signup')} className="inline-block bg-white text-blue-600 font-bold py-3 px-8 rounded-lg shadow-md hover:bg-slate-100 transition-all duration-300">
                  Sign Up for Free
              </button>
          </section>
      </main>
      <footer className="w-full py-10 mt-16 bg-slate-50 border-t border-slate-200">
          <div className="w-full max-w-screen-2xl mx-auto px-6 text-center text-slate-600">
              <h3 className="text-2xl font-bold text-slate-800 mb-6">Get in Touch</h3>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 mb-8">
                  <a href="mailto:support@tnsaledeed.com" className="flex items-center gap-2 text-lg hover:text-blue-600 transition-colors">
                      <EnvelopeIcon className="h-5 w-5" />
                      <span>support@tnsaledeed.com</span>
                  </a>
                  <div className="flex items-center gap-2 text-lg">
                      <PhoneIcon className="h-5 w-5" />
                      <span>+91 94897 21962 / +91 99629 01122</span>
                  </div>
              </div>
              <p className="text-sm text-slate-500">
                  &copy; {new Date().getFullYear()} Vitalize Ventures. All rights reserved.
              </p>
          </div>
      </footer>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={closeModal}>
          <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-lg border border-slate-200/80 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={closeModal} className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-800 rounded-full transition-colors">
              <XMarkIcon className="h-6 w-6"/>
            </button>
            {renderForm()}
             <p className="text-center text-xs text-slate-400 mt-8 px-4">
                By signing up, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
