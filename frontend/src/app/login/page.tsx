"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter your registered institutional email and password.");
      return;
    }

    setIsLoading(true);
    try {
      await login({ email: email.trim(), password });
      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign in. Please verify your credentials.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 group focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-900 via-indigo-800 to-blue-800 flex items-center justify-center text-white shadow-md shadow-indigo-900/20 group-hover:scale-105 transition-transform duration-200">
            <GraduationCap className="w-6 h-6 text-amber-300" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
            KPRIT <span className="text-indigo-900 dark:text-indigo-400 font-bold">CampusHub</span>
          </span>
        </Link>
        <h2 className="mt-5 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Sign In to Student &amp; Faculty Portal
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Kommuri Pratap Reddy Institute of Technology
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 rounded-3xl">
          {/* Success Banner */}
          {success && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-sm text-emerald-800 dark:text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>Signed in successfully! Redirecting to campus hub...</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-start gap-3 text-sm text-rose-800 dark:text-rose-300 animate-in fade-in"
            >
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2"
              >
                Institutional Email Address
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@kpritech.ac.in"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                >
                  Password
                </label>
              </div>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-10 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                size="lg"
                isLoading={isLoading}
                disabled={success}
                className="w-full justify-center group font-semibold bg-indigo-900 hover:bg-indigo-950 text-white"
              >
                <span>Sign In to KPRIT Portal</span>
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
          </form>

          {/* Institutional Trust Note */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
              <span>Unified Access for Students, Faculty &amp; TPO Cell</span>
            </div>
          </div>

          {/* Footer Register Link */}
          <div className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
            Need student registration?{" "}
            <Link
              href="/register"
              className="font-semibold text-indigo-700 dark:text-indigo-400 hover:underline"
            >
              Create Account
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            ← Return to KPRIT CampusHub Home
          </Link>
        </div>
      </div>
    </div>
  );
}
