import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BRAND_NAME } from '../lib/brand';
import {
  Activity,
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  FileText,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Shield,
  Check,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';

// Form validation schema
const loginSchema = z.object({
  username: z.string().min(1, 'Please enter your username or email'),
  password: z.string().min(1, 'Please enter your password'),
  rememberMe: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === 'authenticated') {
      const nextUrl = searchParams.get('next');
      if (nextUrl && nextUrl.startsWith('/')) {
        navigate(nextUrl, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [status, navigate, searchParams]);

  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // System Health Indicator State
  const [healthStatus, setHealthStatus] = useState<'ok' | 'degraded' | 'offline'>('ok');

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await api.auth.getHealth();
        if (isMounted) {
          setHealthStatus(res.status === 'ok' ? 'ok' : 'degraded');
        }
      } catch {
        if (isMounted) setHealthStatus('offline');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Poll every 30s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false,
    },
  });

  const rememberMe = watch('rememberMe');

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await api.auth.login(data.username, data.password, data.rememberMe);
      setAuth(res.accessToken, res.user);

      if (res.user?.mustChangePassword) {
        navigate('/change-password', { replace: true });
        return;
      }

      const nextUrl = searchParams.get('next');
      if (nextUrl && nextUrl.startsWith('/')) {
        navigate(nextUrl, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid username or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-br from-[#FFF7ED] via-[#FFEDD5] to-[#FEF3C7] text-slate-900 flex flex-col justify-between selection:bg-orange-500 selection:text-white font-sans">
      {/* Soft Blurred Background Orbs */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 bg-orange-300/40 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/3 -right-32 w-[500px] h-[500px] bg-amber-200/50 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 left-1/4 w-[450px] h-[450px] bg-orange-200/40 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Header Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        {/* Top-Left Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/25">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight text-slate-900 leading-none">{BRAND_NAME}</div>
            <div className="text-[11px] text-slate-500 font-medium tracking-wide">ISP Operations Platform</div>
          </div>
        </div>

        {/* Top-Right System Operational Indicator */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-white/60 shadow-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              healthStatus === 'ok'
                ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50'
                : healthStatus === 'degraded'
                ? 'bg-amber-500 shadow-xs shadow-amber-500/50'
                : 'bg-rose-500 shadow-xs shadow-rose-500/50'
            }`}
          />
          <span className="text-xs font-medium text-slate-700">
            {healthStatus === 'ok' ? 'System Operational' : healthStatus === 'degraded' ? 'Degraded' : 'Offline'}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 sm:py-12 flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left Column: Hero Copy & Feature Chips */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="lg:col-span-7 flex flex-col items-start"
          >
            {/* Authorized Staff Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100/80 border border-orange-200/60 text-orange-700 text-xs font-semibold mb-6 shadow-2xs">
              <Shield className="w-3.5 h-3.5 text-orange-600" />
              <span>Authorized Staff Access</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12] mb-6">
              Run your network <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600">
                with total confidence.
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-xl mb-8">
              Sign in to manage subscribers, monitor MikroTik routers, collect payments and dispatch field teams, all
              from one secure operations console.
            </p>

            {/* Three Feature Chips */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/70 backdrop-blur-md border border-white/60 shadow-xs text-xs font-medium text-slate-800">
                <ShieldCheck className="w-4 h-4 text-orange-500" />
                <span>Role-Based Access</span>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/70 backdrop-blur-md border border-white/60 shadow-xs text-xs font-medium text-slate-800">
                <FileText className="w-4 h-4 text-orange-500" />
                <span>Audit Logged</span>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/70 backdrop-blur-md border border-white/60 shadow-xs text-xs font-medium text-slate-800">
                <KeyRound className="w-4 h-4 text-orange-500" />
                <span>Encrypted Sessions</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Glass Card Form */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
            className="lg:col-span-5 w-full max-w-md mx-auto"
          >
            <div className="bg-white/80 backdrop-blur-xl border border-white/80 shadow-2xl shadow-orange-950/10 rounded-2xl p-7 sm:p-9 relative">
              {/* Card Header Branding */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-orange-500 to-orange-600 mx-auto flex items-center justify-center text-white shadow-md shadow-orange-500/30 mb-3">
                  <Activity className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">{BRAND_NAME}</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Secure Access · Network Management System</p>
              </div>

              {/* Inline Error Banner */}
              {errorMessage && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Username Field */}
                <div>
                  <label htmlFor="username-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Username or Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="username-input"
                      type="text"
                      autoFocus
                      autoComplete="username"
                      placeholder="Enter your username"
                      aria-invalid={Boolean(errors.username)}
                      aria-describedby={errors.username ? 'username-error' : undefined}
                      {...register('username')}
                      className={`w-full pl-10 pr-3.5 py-2.5 text-sm bg-white/90 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all ${
                        errors.username ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                      }`}
                    />
                  </div>
                  {errors.username && (
                    <p id="username-error" className="text-xs text-rose-600 mt-1 font-medium">
                      {errors.username.message}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="password-input"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      onKeyUp={(e) => setCapsLockOn(e.getModifierState('CapsLock'))}
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? 'password-error' : undefined}
                      {...register('password')}
                      className={`w-full pl-10 pr-10 py-2.5 text-sm bg-white/90 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all ${
                        errors.password ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                      }`}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p id="password-error" className="text-xs text-rose-600 mt-1 font-medium">
                      {errors.password.message}
                    </p>
                  )}
                  {capsLockOn && (
                    <p className="text-[11px] text-amber-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Caps Lock is ON
                    </p>
                  )}
                </div>

                {/* Row: Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-1">
                  <label className="group inline-flex items-center gap-2.5 cursor-pointer select-none">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        {...register('rememberMe')}
                        className="peer sr-only"
                      />
                      <div
                        className={cn(
                          'w-4 h-4 rounded-[6px] border flex items-center justify-center transition-all duration-200',
                          'peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500/30 peer-focus-visible:ring-offset-1',
                          rememberMe
                            ? 'bg-gradient-to-tr from-orange-500 to-orange-600 border-orange-500 shadow-xs shadow-orange-500/35 ring-1 ring-orange-500/20'
                            : 'bg-white/95 border-slate-300 group-hover:border-orange-400 group-hover:bg-white shadow-2xs'
                        )}
                      >
                        <Check
                          className={cn(
                            'w-3 h-3 text-white stroke-[2.8] transition-all duration-150',
                            rememberMe ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                          )}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-600 group-hover:text-slate-800 transition-colors">
                      Remember me
                    </span>
                  </label>

                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in securely</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Demo Credentials Quick-Fill Assistant */}
                <div className="mt-3.5 pt-3 border-t border-slate-100/90 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium text-slate-600">
                    <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                    Demo login:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setValue('username', 'admin', { shouldValidate: true });
                      setValue('password', 'admin123!', { shouldValidate: true });
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100/80 text-orange-700 font-semibold transition-colors border border-orange-200/60 shadow-2xs cursor-pointer hover:border-orange-300"
                  >
                    <span>Auto-fill Admin</span>
                    <span className="text-[10px] text-orange-600/70">(admin / admin123!)</span>
                  </button>
                </div>
              </form>

              {/* Small Trust Badges Row */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-4 text-[11px] text-slate-500 font-medium">
                <div className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span>Secure Login</span>
                </div>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span>SSL Protected</span>
                </div>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span>256-bit Encryption</span>
                </div>
              </div>

              {/* Footer text */}
              <p className="text-center text-[10px] text-slate-400 mt-4">
                By signing in you agree to the{' '}
                <span className="text-orange-600 hover:underline cursor-pointer">Terms & Security Policy</span>.
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-200/50 gap-2">
        <div>© 2026 {BRAND_NAME}. All rights reserved.</div>
        <div>Powered by {BRAND_NAME} ISP Suite</div>
      </footer>
    </div>
  );
};
