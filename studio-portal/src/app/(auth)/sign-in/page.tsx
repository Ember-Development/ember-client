"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SignInForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        alert(data.error || "Failed to send magic link");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to send magic link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = () => {
    switch (error) {
      case "invalid_token":
        return "Invalid or missing token.";
      case "expired_token":
        return "This magic link has expired. Please request a new one.";
      case "token_used":
        return "This magic link has already been used. Please request a new one.";
      case "account_inactive":
        return "Your account is inactive. Please contact support.";
      case "verification_failed":
        return "Verification failed. Please try again.";
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="w-full max-w-md">
        {/* Logo/Brand Area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Ember Developer Portal
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to your account
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8">
            {/* Error State */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-red-900">Authentication Error</p>
                    <p className="text-sm text-red-700 mt-1">{getErrorMessage()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success State */}
            {success ? (
              <div className="space-y-6">
                <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-emerald-900">
                        Magic link generated
                      </h3>
                      <p className="text-sm text-emerald-700 mt-1">
                        Check your server console for the authentication link
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-white border border-emerald-200">
                      <p className="text-xs font-medium text-emerald-900 mb-1">Development Mode</p>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🔗</span>
                        <code className="text-xs font-mono text-emerald-700">
                          MAGIC LINK in console
                        </code>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-emerald-200">
                      <ol className="space-y-2 text-xs text-emerald-700">
                        <li className="flex gap-2">
                          <span className="font-semibold text-emerald-900">1.</span>
                          <span>Check your terminal/console output</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold text-emerald-900">2.</span>
                          <span>Copy the magic link URL</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold text-emerald-900">3.</span>
                          <span>Paste it in your browser address bar</span>
                        </li>
                      </ol>
                    </div>

                    <p className="text-xs text-emerald-600 pt-2">
                      Link expires in 15 minutes
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSuccess(false)}
                  className="w-full text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  ← Send another link
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label 
                    htmlFor="email" 
                    className="block text-sm font-medium text-slate-700"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="email"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-all"
                    placeholder="name@company.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    "Continue with email"
                  )}
                </button>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs text-center text-slate-500">
                    We'll send you a magic link to sign in securely
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            Protected by enterprise-grade security
          </p>
        </div>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <main className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-slate-600">Loading...</p>
        </div>
      </main>
    }>
      <SignInForm />
    </Suspense>
  );
}
