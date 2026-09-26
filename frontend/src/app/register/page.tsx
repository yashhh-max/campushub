"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Mail,
  Lock,
  User as UserIcon,
  BookOpen,
  Calendar,
  IdCard,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

const KPRIT_DEPARTMENTS = [
  "Computer Science & Engineering (CSE)",
  "CSE (Artificial Intelligence & Machine Learning)",
  "CSE (Data Science)",
  "Electronics & Communication Engineering (ECE)",
  "Electrical & Electronics Engineering (EEE)",
  "Civil Engineering (CE)",
  "Mechanical Engineering (ME)",
  "Humanities & Sciences (H&S)",
];

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState(KPRIT_DEPARTMENTS[0]);
  const [graduationYear, setGraduationYear] = useState<number>(2027);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    setIsLoading(true);
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        student_id: studentId.trim() || undefined,
        department: department.trim() || undefined,
        graduation_year: Number(graduationYear) || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed. Please check your details.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
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
          Create Student Account
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Kommuri Pratap Reddy Institute of Technology &bull; Autonomous
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 rounded-3xl">
          {/* Success Banner */}
          {success && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-sm text-emerald-800 dark:text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>Registration successful! Your student profile is active. Redirecting...</span>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Full Student Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. K. Sai Varun"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Institutional Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@kpritech.ac.in"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Student ID / Roll No & Department Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="studentId"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Hall Ticket / Roll No.
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <IdCard className="w-4 h-4" />
                  </div>
                  <input
                    id="studentId"
                    name="studentId"
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. 22K81A0501"
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="graduationYear"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Graduation Year
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <select
                    id="graduationYear"
                    name="graduationYear"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(Number(e.target.value))}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    {[2025, 2026, 2027, 2028, 2029].map((year) => (
                      <option key={year} value={year}>
                        Class of {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Department Dropdown */}
            <div>
              <label
                htmlFor="department"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Academic Department
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <select
                  id="department"
                  name="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  {KPRIT_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars"
                    className="block w-full pl-10 pr-9 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Confirm <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <Button
                type="submit"
                size="lg"
                isLoading={isLoading}
                disabled={success}
                className="w-full justify-center group font-semibold bg-indigo-900 hover:bg-indigo-950 text-white"
              >
                <span>Register for KPRIT Student Portal</span>
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
          </form>

          {/* Verification Badge */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
              <span>Affiliated to JNTUH &bull; Approved by AICTE</span>
            </div>
          </div>

          {/* Login Link */}
          <div className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-indigo-700 dark:text-indigo-400 hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
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
