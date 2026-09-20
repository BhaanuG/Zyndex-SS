import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { AlertCircle, ArrowLeft, KeyRound, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import apiClient from '@/services/api/apiClient';
import { resolveAuthRedirectPath } from '@/utils/redirectHelper';

const OTP_EXPIRY_SECONDS = 120;
const OTP_REQUEST_SESSION_KEY = 'mail_otp_request_state';

function getOtpRequestState() {
  try {
    return JSON.parse(sessionStorage.getItem(OTP_REQUEST_SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function getOtpRequestKey(authData) {
  return `${authData.role}:${String(authData.email || '').toLowerCase()}`;
}

export default function MailOtpVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [otpInput, setOtpInput] = useState('');
  const [status, setStatus] = useState('Preparing your mail OTP...');
  const [error, setError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(OTP_EXPIRY_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const isAdminOtp = location.pathname.includes('/Admin/');

  const loginPath = isAdminOtp ? '/Zyndex/Admin/Log-In' : '/Zyndex/User/Log-In';

  useEffect(() => {
    const pendingAuth = sessionStorage.getItem('pending_auth');
    const humanVerified = sessionStorage.getItem('human_verification_passed') === 'true';

    if (!pendingAuth || !humanVerified) {
      navigate(loginPath, { replace: true });
      return;
    }

    const authData = JSON.parse(pendingAuth);
    if ((isAdminOtp && authData.role !== 'admin') || (!isAdminOtp && authData.role !== 'user')) {
      navigate(authData.role === 'admin' ? '/Zyndex/Admin/Log-In' : '/Zyndex/User/Log-In', { replace: true });
      return;
    }

    async function requestOtp() {
      setSending(true);
      setError('');

      try {
        const requestKey = getOtpRequestKey(authData);
        const existingRequest = getOtpRequestState();
        const now = Date.now();

        if (existingRequest?.key === requestKey && existingRequest.expiresAt > now) {
          const secondsLeft = Math.max(1, Math.ceil((existingRequest.expiresAt - now) / 1000));
          setRemainingSeconds(secondsLeft);
          setStatus(`A 4-digit OTP was already sent to ${authData.email}. It expires in ${secondsLeft} seconds.`);
          return;
        }

        sessionStorage.setItem(
          OTP_REQUEST_SESSION_KEY,
          JSON.stringify({
            key: requestKey,
            requestedAt: now,
            expiresAt: now + OTP_EXPIRY_SECONDS * 1000,
          })
        );

        const response = await apiClient.post('/send-otp', {
          email: authData.email,
          role: authData.role,
          force: false,
        });

        const expiresInSeconds = response.expiresInSeconds || OTP_EXPIRY_SECONDS;
        sessionStorage.setItem(
          OTP_REQUEST_SESSION_KEY,
          JSON.stringify({
            key: requestKey,
            requestedAt: Date.now(),
            expiresAt: Date.now() + expiresInSeconds * 1000,
          })
        );
        setRemainingSeconds(expiresInSeconds);
        
        const isEmailSent = response.emailSent;
        setStatus(
          isEmailSent
            ? `A 4-digit OTP was sent to ${authData.email}. It expires in 2 minutes.`
            : `A 4-digit OTP was generated (Development Mode). Check backend console.`
        );

      } catch (requestError) {
        sessionStorage.removeItem(OTP_REQUEST_SESSION_KEY);
        setStatus('');
        setError(requestError?.message || 'Could not generate OTP. Please try again.');
      } finally {
        setSending(false);
      }
    }

    requestOtp();
  }, [isAdminOtp, loginPath, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds((current) => {
        const next = Math.max(0, current - 1);
        if (next === 0) {
          setError('OTP expired. Please resend a new OTP.');
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const resendOtp = async () => {
    const pendingAuth = sessionStorage.getItem('pending_auth');
    if (!pendingAuth) {
      navigate(loginPath, { replace: true });
      return;
    }

    const authData = JSON.parse(pendingAuth);
    setOtpInput('');
    setStatus('');
    setError('');
    setSending(true);

    try {
      const requestKey = getOtpRequestKey(authData);
      sessionStorage.setItem(
        OTP_REQUEST_SESSION_KEY,
        JSON.stringify({
          key: requestKey,
          requestedAt: Date.now(),
          expiresAt: Date.now() + OTP_EXPIRY_SECONDS * 1000,
        })
      );

       const response = await apiClient.post('/send-otp', {
        email: authData.email,
        role: authData.role,
        force: true,
      });

      const expiresInSeconds = response.expiresInSeconds || OTP_EXPIRY_SECONDS;
      sessionStorage.setItem(
        OTP_REQUEST_SESSION_KEY,
        JSON.stringify({
          key: requestKey,
          requestedAt: Date.now(),
          expiresAt: Date.now() + expiresInSeconds * 1000,
        })
      );
      setRemainingSeconds(expiresInSeconds);
      
      const isEmailSent = response.emailSent;
      setStatus(
        isEmailSent
          ? `A new OTP was sent to ${authData.email}. It expires in 2 minutes.`
          : `A new OTP was generated (Development Mode). Check backend console.`
      );

    } catch (requestError) {
      sessionStorage.removeItem(OTP_REQUEST_SESSION_KEY);
      setError(requestError?.message || 'Could not resend OTP. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const pendingAuth = JSON.parse(sessionStorage.getItem('pending_auth') || 'null');
      if (!pendingAuth) {
        throw new Error('OTP session is missing. Please log in again.');
      }

      await apiClient.post('/verify-otp', {
        email: pendingAuth.email,
        role: pendingAuth.role,
        otp: otpInput,
      });

      const userData = await login(pendingAuth.email, pendingAuth.password, pendingAuth.role);
      sessionStorage.removeItem('pending_auth');
      sessionStorage.removeItem('human_verification_passed');
      sessionStorage.removeItem(OTP_REQUEST_SESSION_KEY);
      sessionStorage.setItem('show_auth_transition', 'true');

      const targetDestination = resolveAuthRedirectPath(userData);
      navigate(targetDestination, { replace: true });
    } catch (submitError) {
      setError(submitError?.message || 'OTP verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    sessionStorage.removeItem('human_verification_passed');
    sessionStorage.removeItem(OTP_REQUEST_SESSION_KEY);
    navigate(loginPath, { replace: true });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <motion.div className="w-full max-w-lg" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-orange-200/50 p-10">
            <div className="size-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-500/30">
              <Mail className="size-10 text-white" />
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-3">Mail OTP Verification</h1>
              <p className="text-slate-600">Enter the 4-digit OTP generated by the backend for your login email.</p>
              <p className="text-sm text-orange-700 mt-3 font-medium">Time remaining: {remainingSeconds}s</p>
            </div>

            {status && (
              <div className="mb-5 flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                <ShieldCheck className="size-5 mt-0.5" />
                <span>{status}</span>
              </div>
            )}

            {error && (
              <div className="mb-5 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                <AlertCircle className="size-5 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">4-digit OTP</label>
                <div className="relative flex items-center">
                  <KeyRound className="absolute left-4 size-5 text-slate-400" />
                  <input
                    value={otpInput}
                    onChange={(event) => setOtpInput(event.target.value.replace(/\D/g, '').slice(0, 4))}
                    inputMode="numeric"
                    placeholder="Enter OTP"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all text-center tracking-[0.75em] font-bold"
                    required
                    minLength={4}
                    maxLength={4}
                  />
                </div>
              </div>

              <button type="submit" disabled={submitting || sending || remainingSeconds === 0} className="w-full py-4 px-6 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-600/30 disabled:opacity-60">
                {submitting ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>

            <div className="flex items-center justify-between gap-3 mt-5">
              <button onClick={handleBack} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-orange-600 font-medium">
                <ArrowLeft className="size-4" />
                Back to login
              </button>
              <button onClick={resendOtp} disabled={sending} className="inline-flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-semibold disabled:opacity-60">
                <RefreshCw className={`size-4 ${sending ? 'animate-spin' : ''}`} />
                Resend OTP
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
