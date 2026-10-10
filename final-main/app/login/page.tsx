'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  User,
  GraduationCap,
  Building2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  ShieldCheck,
  Check
} from 'lucide-react';
import { AuthService } from '@/lib/services/authService';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useLoading } from '@/lib/context/LoadingContext';
import { useSearchParams, usePathname } from 'next/navigation';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const initialMode = pathname.includes('register') || searchParams.get('mode') === 'register';
  const initialRole = searchParams.get('role') === 'institution_admin' ? 'institution_admin' : 'student';

  const [isSignUp, setIsSignUp] = useState<boolean>(initialMode);
  const [role, setRole] = useState<'student' | 'institution_admin'>(initialRole);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Register Form State
  const [registerData, setRegisterData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    institutionName: '',
    institutionType: 'college'
  });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [alreadyExisted, setAlreadyExisted] = useState(false);

  const { setLoading: setGlobalLoading, isLoading } = useLoading();
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await AuthService.getSession();
        if (session) {
          const res = await fetch('/api/auth/me');
          if (res.ok) {
            const data = await res.json();
            const profile = data.user;
            if (profile) {
              if (profile.role === 'student' && !profile.email_verified) {
                localStorage.removeItem('aptivo_user');
                setAuthChecking(false);
                return;
              }

              localStorage.setItem('aptivo_user', JSON.stringify(profile));
              if (profile.status === 'suspended' || profile.status === 'blocked') {
                setAuthChecking(false);
                return;
              }

              let target = '/dashboard';
              if (profile.role === 'super_admin') target = '/admin/dashboard';
              else if (profile.role === 'institution_admin') target = '/institution-admin';
              window.location.href = target;
              return;
            }
          }
        }
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        setAuthChecking(false);
      }
    };
    checkSession();

    const rememberedEmail = localStorage.getItem('aptivo_remembered_email');
    if (rememberedEmail) {
      setLoginEmail(rememberedEmail);
      setRememberMe(true);
    }

    if (searchParams.get('verified') === 'true') {
      if (searchParams.get('pending_approval') === 'true') {
        setInfoMessage('Email verified! Your institution account is pending approval.');
      } else {
        setInfoMessage('Email verified successfully! You can now sign in.');
      }
    }

    const errorType = searchParams.get('error');
    if (errorType === 'suspended' || errorType === 'blocked' || errorType === 'account_suspended') {
      setError('ACCESS DENIED: Your account has been restricted.');
    } else if (errorType === 'not_registered') {
      setError('No account found. Please register first.');
      setIsSignUp(true);
    } else if (errorType === 'expired_token') {
      setError('Your verification link has expired. Please register again.');
    }
  }, [searchParams]);

  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const password = registerData.password;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  }, [registerData.password]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setGlobalLoading(true, 'Verifying Credentials...');

    try {
      const result = await AuthService.login({ email: loginEmail, password: loginPassword });
      if (result.error) {
        if (result.error.includes('PENDING_APPROVAL') || result.error.toLowerCase().includes('pending approval')) {
          setError('');
          setInfoMessage('Your institution account is pending Super Admin approval.');
          setGlobalLoading(false);
          return;
        }
        if (result.error.includes('EMAIL_NOT_VERIFIED') || result.error.toLowerCase().includes('email not verified')) {
          setError('Please verify your email first. Check your inbox for the link.');
          setGlobalLoading(false);
          return;
        }
        if (result.error.includes('ACCOUNT_SUSPENDED') || result.error.toLowerCase().includes('suspended')) {
          setError('Your account has been suspended. Please contact support.');
          setGlobalLoading(false);
          return;
        }
        setError(result.error);
        setGlobalLoading(false);
        return;
      }

      if (result.user) {
        const user = result.user;

        if (role === 'student' && (user.role === 'super_admin' || user.role === 'institution_admin')) {
          setError('This is an administrator account. Please select Institution.');
          setGlobalLoading(false);
          return;
        }

        if (role === 'institution_admin' && user.role === 'student') {
          setError('This is a student account. Please select Student.');
          setGlobalLoading(false);
          return;
        }

        let target = '/dashboard';
        if (user.role === 'super_admin') target = '/admin/dashboard';
        else if (user.role === 'institution_admin') target = '/institution-admin';

        if (rememberMe) {
          localStorage.setItem('aptivo_remembered_email', loginEmail);
        } else {
          localStorage.removeItem('aptivo_remembered_email');
        }

        setInfoMessage('Login successful! Redirecting...');
        localStorage.setItem('aptivo_user', JSON.stringify(user));

        setTimeout(() => {
          window.location.href = target;
        }, 500);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during login');
    } finally {
      setTimeout(() => setGlobalLoading(false), 2000);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setGlobalLoading(true, 'Creating Account...');

    if (!registerData.fullName || !registerData.email || !registerData.password) {
      setError('Please fill in all required fields');
      setGlobalLoading(false);
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      setGlobalLoading(false);
      return;
    }

    if (role === 'institution_admin' && !registerData.institutionName) {
      setError('Please provide your institution name');
      setGlobalLoading(false);
      return;
    }

    if (!agreeToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      setGlobalLoading(false);
      return;
    }

    try {
      const registerResult = await AuthService.register({
        email: registerData.email,
        password: registerData.password,
        fullName: registerData.fullName,
        role: role,
        institutionName: role === 'institution_admin' ? registerData.institutionName : undefined,
        institutionType: role === 'institution_admin' ? registerData.institutionType : undefined
      });

      setGlobalLoading(false);

      if (registerResult.error) {
        setError(registerResult.error);
        return;
      }

      setAlreadyExisted(registerResult.alreadyExisted ?? false);
      setRegisterSuccess(true);
    } catch (err) {
      setError('An unexpected error occurred during registration');
      setGlobalLoading(false);
    }
  };

  const handleGoogleAuth = async (intent: 'login' | 'register') => {
    setError('');
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'START_GOOGLE_AUTH', intent }));
      return;
    }
    setGlobalLoading(true, 'Connecting to Google...');
    try {
      const domain = window.location.hostname.includes('aptivo.tech') ? 'domain=.aptivo.tech;' : '';
      document.cookie = `auth_intent=${intent}; path=/; max-age=600; ${domain}`;
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (err) {
      setError('Google authentication failed. Please try again.');
      setGlobalLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen w-full bg-slate-100/90 flex flex-col items-center justify-center p-3 sm:p-4 lg:overflow-hidden relative selection:bg-teal-100 selection:text-teal-900">

      {authChecking ? (
        <div className="w-full max-w-sm mx-auto text-center space-y-4 py-16">
          <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-teal-600/20">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-5xl h-auto lg:h-[640px] lg:max-h-[92vh] flex flex-col justify-center relative">
          
          {/* Main Sliding Double-Panel Container */}
          <div className="bg-white rounded-3xl lg:rounded-[2.5rem] shadow-2xl shadow-slate-300/60 overflow-hidden relative h-full w-full border border-slate-200/80">
            
            {/* Home button placed directly inside the card (top-left) */}
            <Link
              href="/"
              className="absolute top-6 left-6 z-40 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-slate-200/90 hover:border-teal-300 shadow-sm hover:shadow text-xs font-black text-slate-700 hover:text-teal-700 transition-all cursor-pointer group"
              title="Back to Home"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-slate-500 group-hover:text-teal-600" />
              <span>Home</span>
            </Link>
            
            {/* ─── Sign In Form (Left on base) ─── */}
            <div
              className={`w-full lg:w-1/2 h-full lg:absolute top-0 left-0 transition-all duration-700 ease-in-out flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-8 overflow-y-auto ${
                isSignUp ? 'hidden lg:flex lg:opacity-0 lg:pointer-events-none lg:translate-x-full z-10' : 'flex opacity-100 z-20'
              }`}
            >
              <div className="max-w-md mx-auto w-full space-y-5 text-center">
                
                {/* Header */}
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Sign In</h2>
                  <p className="text-xs text-slate-500 font-medium">Welcome back to your Aptivo portal</p>
                </div>

                {/* Social Login Icon */}
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => handleGoogleAuth('login')}
                    className="w-11 h-11 rounded-2xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 flex items-center justify-center transition-all shadow-xs group cursor-pointer"
                    title="Sign in with Google"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                  or use your email account
                </p>

                {/* Role Switcher */}
                <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                      role === 'student' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('institution_admin')}
                    className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                      role === 'institution_admin' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Institution
                  </button>
                </div>

                {/* Alerts */}
                {(infoMessage || error) && (
                  <div
                    className={`p-3 rounded-xl flex items-start gap-2 text-xs font-bold leading-relaxed animate-in fade-in ${
                      infoMessage ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {infoMessage ? (
                      <CheckCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <span>{infoMessage || error}</span>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLoginSubmit} className="space-y-3 text-left">
                  <div className="relative">
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      placeholder="Email"
                      className="w-full px-4 py-3 bg-slate-100/90 border border-transparent focus:border-teal-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-none transition-all"
                    />
                  </div>

                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      placeholder="Password"
                      className="w-full px-4 pr-10 py-3 bg-slate-100/90 border border-transparent focus:border-teal-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 p-1 cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-500 font-medium">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setRememberMe(val);
                          if (!val) localStorage.removeItem('aptivo_remembered_email');
                        }}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 accent-teal-600 cursor-pointer"
                      />
                      <span>Remember me</span>
                    </label>
                    <Link href="/forgot-password" className="text-slate-500 hover:text-teal-700 font-semibold hover:underline">
                      Forgot your password?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 bg-[#042f2e] hover:bg-teal-900 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#042f2e]/20 active:scale-[0.99] cursor-pointer mt-2"
                  >
                    {isLoading ? 'Verifying...' : 'Sign In'}
                  </button>
                </form>

                {/* Mobile Toggle Button */}
                <div className="block lg:hidden pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className="text-xs font-bold text-teal-700 hover:underline"
                  >
                    Don't have an account? Sign Up
                  </button>
                </div>

              </div>
            </div>

            {/* ─── Sign Up Form (Right on base) ─── */}
            <div
              className={`w-full lg:w-1/2 h-full lg:absolute top-0 right-0 transition-all duration-700 ease-in-out flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-8 overflow-y-auto ${
                isSignUp ? 'flex opacity-100 z-20' : 'hidden lg:flex lg:opacity-0 lg:pointer-events-none lg:-translate-x-full z-10'
              }`}
            >
              <div className="max-w-md mx-auto w-full space-y-4 text-center">
                
                {/* Header */}
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Create Account</h2>
                  <p className="text-xs text-slate-500 font-medium">Join 20,000+ entry test MCQs</p>
                </div>

                {/* Google Sign-up */}
                <div className="flex justify-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleGoogleAuth('register')}
                    className="w-11 h-11 rounded-2xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 flex items-center justify-center transition-all shadow-xs group cursor-pointer"
                    title="Sign up with Google"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                  or use your email for registration
                </p>

                {/* Role Switcher */}
                <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                      role === 'student' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('institution_admin')}
                    className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                      role === 'institution_admin' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Institution
                  </button>
                </div>

                {registerSuccess ? (
                  <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-left space-y-2">
                    <p className="text-xs font-black text-teal-900">
                      {alreadyExisted ? 'Account Exists' : 'Verification Link Sent!'}
                    </p>
                    <p className="text-[11px] text-teal-700 font-medium">
                      Check your inbox at <strong>{registerData.email}</strong> to activate your account.
                    </p>
                    <button
                      type="button"
                      onClick={() => { setRegisterSuccess(false); setIsSignUp(false); }}
                      className="text-xs font-black text-teal-800 underline mt-2 block"
                    >
                      Proceed to Sign In
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRegisterSubmit} className="space-y-2.5 text-left">
                    
                    {role === 'institution_admin' && (
                      <input
                        type="text"
                        value={registerData.institutionName}
                        onChange={(e) => setRegisterData({ ...registerData, institutionName: e.target.value })}
                        required
                        placeholder="Academy / College Name"
                        className="w-full px-4 py-2.5 bg-slate-100/90 border border-transparent focus:border-teal-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-none"
                      />
                    )}

                    <input
                      type="text"
                      value={registerData.fullName}
                      onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                      required
                      placeholder="Name"
                      className="w-full px-4 py-2.5 bg-slate-100/90 border border-transparent focus:border-teal-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-none"
                    />

                    <input
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      required
                      placeholder="Email"
                      className="w-full px-4 py-2.5 bg-slate-100/90 border border-transparent focus:border-teal-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-none"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <input
                          type={showRegisterPassword ? 'text' : 'password'}
                          value={registerData.password}
                          onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                          required
                          placeholder="Password"
                          className="w-full px-3 pr-8 py-2.5 bg-slate-100/90 border border-transparent focus:border-teal-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 p-0.5 cursor-pointer"
                        >
                          {showRegisterPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                          required
                          placeholder="Confirm"
                          className="w-full px-3 pr-8 py-2.5 bg-slate-100/90 border border-transparent focus:border-teal-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 p-0.5 cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Password Strength Meter */}
                    {registerData.password.length > 0 && (
                      <div className="space-y-1 px-0.5">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((v) => (
                            <div
                              key={v}
                              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                passwordStrength >= v
                                  ? passwordStrength <= 2
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-500'
                                  : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-[10px] text-right font-bold text-slate-400">
                          {passwordStrength <= 1 && 'Weak'}
                          {passwordStrength === 2 && 'Fair'}
                          {passwordStrength === 3 && 'Good'}
                          {passwordStrength >= 4 && 'Strong password'}
                        </p>
                      </div>
                    )}

                    {/* Terms & Privacy Policy Agreement */}
                    <label className="flex items-start gap-2 cursor-pointer text-left pt-1 px-0.5">
                      <input
                        type="checkbox"
                        required
                        checked={agreeToTerms}
                        onChange={(e) => setAgreeToTerms(e.target.checked)}
                        className="w-3.5 h-3.5 mt-0.5 rounded border-slate-300 text-teal-600 accent-teal-600 cursor-pointer shrink-0"
                      />
                      <span className="text-[11px] text-slate-500 font-medium leading-snug">
                        I agree to the{' '}
                        <Link href="/terms" target="_blank" className="text-teal-700 font-bold hover:underline">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" target="_blank" className="text-teal-700 font-bold hover:underline">
                          Privacy Policy
                        </Link>.
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 bg-[#042f2e] hover:bg-teal-900 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#042f2e]/20 active:scale-[0.99] cursor-pointer mt-1"
                    >
                      {isLoading ? 'Creating...' : 'Sign Up'}
                    </button>
                  </form>
                )}

                {/* Mobile Toggle Button */}
                <div className="block lg:hidden pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className="text-xs font-bold text-teal-700 hover:underline"
                  >
                    Already have an account? Sign In
                  </button>
                </div>

              </div>
            </div>

            {/* ─── Desktop Sliding Overlay Panel ─── */}
            <div
              className={`hidden lg:block absolute top-0 left-1/2 w-1/2 h-full overflow-hidden transition-transform duration-700 ease-in-out z-30 ${
                isSignUp ? '-translate-x-full rounded-r-[100px]' : 'translate-x-0 rounded-l-[100px]'
              }`}
            >
              <div
                className={`bg-gradient-to-br from-teal-600 via-teal-700 to-[#042f2e] text-white relative -left-full h-full w-[200%] transition-transform duration-700 ease-in-out ${
                  isSignUp ? 'translate-x-1/2' : 'translate-x-0'
                }`}
              >
                
                {/* Overlay Panel Left (Visible when isSignUp = true) */}
                <div className="absolute top-0 left-0 w-1/2 h-full flex flex-col justify-center items-center px-12 text-center space-y-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-sm">Welcome Back!</h2>
                    <p className="text-white text-xs leading-relaxed max-w-xs font-medium opacity-95">
                      To keep practicing and tracking your entry-test readiness, please sign in with your personal info.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(false); setError(''); }}
                    className="px-8 py-3 rounded-xl border-2 border-white text-white font-black text-xs uppercase tracking-wider hover:bg-white hover:text-teal-800 transition-all cursor-pointer active:scale-95 shadow-lg shadow-black/10"
                  >
                    Sign In
                  </button>
                </div>

                {/* Overlay Panel Right (Visible when isSignUp = false) */}
                <div className="absolute top-0 right-0 w-1/2 h-full flex flex-col justify-center items-center px-12 text-center space-y-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-sm">Hello, Friend!</h2>
                    <p className="text-white text-xs leading-relaxed max-w-xs font-medium opacity-95">
                      Enter your details to start practicing 20,000+ verified past MCQs with step-by-step solutions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(true); setError(''); }}
                    className="px-8 py-3 rounded-xl border-2 border-white text-white font-black text-xs uppercase tracking-wider hover:bg-white hover:text-teal-800 transition-all cursor-pointer active:scale-95 shadow-lg shadow-black/10"
                  >
                    Sign Up
                  </button>
                </div>

              </div>
            </div>

          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-1.5 text-center mt-3 text-slate-400 text-[11px] font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>256-bit SSL encrypted & secure</span>
          </div>

        </div>
      )}
    </div>
  );
}
