import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Mail, Lock, User, ArrowRight, Menu, X, Eye, EyeOff, KeyRound, CheckCircle2, Loader2 } from 'lucide-react';
import emailjs from '@emailjs/browser';
import authService from '@/services/api/authService';

const EMAILJS_PUBLIC_KEY = 'uZuzCMh8qe38fb3SX';
const EMAILJS_SERVICE_ID = 'service_d8xn9d3';
const EMAILJS_TEMPLATE_ID = 'template_oost5oj';

// Loader Component with Book Animation
function SubmissionLoader({ message }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl p-12 max-w-md mx-4 text-center depth-3d-float"
      >
        {/* Rotating Book Icon */}
        <motion.div
          className="mb-6 inline-block"
          animate={{ rotateY: 360 }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
            <BookOpen className="size-10 text-white" />
          </div>
        </motion.div>

        {/* Message */}
        <h3 className="text-2xl font-bold text-slate-900 mb-3">
          Processing Your Request
        </h3>
        <p className="text-slate-600 leading-relaxed mb-6">
          {message}
        </p>

        {/* Loading Dots */}
        <div className="flex items-center justify-center gap-2">
          <motion.div
            className="w-2 h-2 bg-orange-600 rounded-full"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-2 h-2 bg-orange-600 rounded-full"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="w-2 h-2 bg-orange-600 rounded-full"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [userType, setUserType] = useState('user'); // 'user' or 'admin'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [previousPassword, setPreviousPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPreviousPassword, setShowPreviousPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showLoader, setShowLoader] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState('');

  // Password strength calculation
  const getPasswordStrength = (password) => {
    if (!password) return { text: '', color: '' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { text: 'Weak', color: 'text-red-600' };
    if (strength <= 3) return { text: 'Fair', color: 'text-orange-600' };
    if (strength <= 4) return { text: 'Good', color: 'text-amber-600' };
    return { text: 'Strong', color: 'text-green-600' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Password complexity validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError('Password must be at least 8 characters long, contain at least one uppercase letter, one digit, and one special character.');
      setIsSubmitting(false);
      return;
    }

    try {
      const requestPayload = {
        email,
        fullName,
        role: userType,
        previousPassword,
        newPassword,
      };

      // 1. Submit reset request to backend first
      await authService.requestPasswordReset(requestPayload);

      // 2. Try to send reset email (EmailJS is REQUIRED for password reset)
      try {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            from_name: fullName,
            to_name: fullName,
            user_name: fullName,
            from_email: email,
            to_email: email,
            reply_to: email,
            user_email: email,
            email,
            user_type: userType.toUpperCase(),
            account_type: userType.toUpperCase(),
            previous_password: previousPassword || 'Not provided',
            new_password: '***hidden***',
            message: `Password reset request from ${fullName} (${userType.toUpperCase()} account). Previous password: ${previousPassword || 'Not provided'}`,
          },
          EMAILJS_PUBLIC_KEY
        );
      } catch (mailError) {
        console.error('Password reset email failed to send:', mailError);
        throw new Error('Your request was processed, but the email could not be sent. Please try again.');
      }

      // Show loader with personalized message
      setLoaderMessage(`Thank you, ${fullName}! Your ${userType} account password reset request has been submitted. We're processing your request and will send instructions to ${email} shortly.`);
      setShowLoader(true);

      // Keep loader visible for 15 seconds, then redirect
      setTimeout(() => {
        setShowLoader(false);
        setIsSubmitting(false);
        
        // Clear form
        setFullName('');
        setEmail('');
        setPreviousPassword('');
        setNewPassword('');
        
        // Redirect to login after successful submission
        setTimeout(() => {
          navigate('/Zyndex/User/Log-In');
        }, 500);
      }, 15000); // 15 seconds as requested

    } catch (err) {
      console.error('Password reset request failed:', err);
      setError(err.message || 'Failed to send reset request. Please try again.');
      setIsSubmitting(false);
      setShowLoader(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Submission Loader */}
      <AnimatePresence>
        {showLoader && <SubmissionLoader message={loaderMessage} />}
      </AnimatePresence>

      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] bg-[size:32px_32px]" />
        
        {/* Floating Orbs */}
        <motion.div
          className="absolute top-20 left-20 w-72 h-72 bg-orange-400/20 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-red-400/20 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Header */}
      <motion.header 
        className="relative z-10 py-6 px-8 backdrop-blur-sm border-b border-orange-200/50 depth-3d-elevated glass-3d"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.05 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-orange-600/20 rounded-xl blur-xl" />
              <div className="relative bg-gradient-to-br from-orange-600 to-red-600 p-2.5 rounded-xl shadow-lg">
                <BookOpen className="size-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Zyndex
              </h1>
              <p className="text-xs text-slate-500 font-medium">Educational Excellence</p>
            </div>
          </motion.div>

          {/* Back to Login Link */}
          <Link 
            to="/Zyndex/User/Log-In"
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
          >
            Back to Login
          </Link>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 py-12">
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          {/* Password Reset Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.43, 0.13, 0.23, 0.96] }}
            className="relative w-full max-w-lg"
          >
            {/* Card Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-3xl blur-3xl opacity-10" />
            
            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-orange-200/50 p-8 lg:p-10 depth-3d-float glass-3d surface-highlight">
              {/* Title Section */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-8 text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg mb-4">
                  <KeyRound className="size-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">
                  Reset Password
                </h2>
                <p className="text-slate-600">
                  Secure your account with a new password
                </p>
              </motion.div>

              {/* Form */}
              <motion.form
                onSubmit={handleSubmit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="space-y-5"
              >
                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 border border-red-200 rounded-xl"
                  >
                    <p className="text-sm text-red-600 font-medium">{error}</p>
                  </motion.div>
                )}

                {/* User Type Selection */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Account Type
                  </label>
                  <div className="relative p-1.5 bg-slate-100 rounded-xl depth-3d-input">
                    <div className="grid grid-cols-2 gap-1 relative">
                      {/* Sliding Background */}
                      <motion.div
                        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg shadow-lg"
                        initial={false}
                        animate={{
                          x: userType === 'user' ? '0%' : '100%'
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 30
                        }}
                      />
                      
                      {/* User Button */}
                      <motion.button
                        type="button"
                        onClick={() => setUserType('user')}
                        className={`relative z-10 py-3 px-6 rounded-lg font-semibold transition-colors ${
                          userType === 'user'
                            ? 'text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <User className="size-4" />
                          <span>User</span>
                        </div>
                      </motion.button>

                      {/* Admin Button */}
                      <motion.button
                        type="button"
                        onClick={() => setUserType('admin')}
                        className={`relative z-10 py-3 px-6 rounded-lg font-semibold transition-colors ${
                          userType === 'admin'
                            ? 'text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <KeyRound className="size-4" />
                          <span>Admin</span>
                        </div>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>

                {/* Full Name Field */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                >
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl opacity-0 group-focus-within:opacity-10 blur transition-opacity" />
                    <div className="relative flex items-center">
                      <User className="absolute left-4 size-5 text-slate-400 group-focus-within:text-orange-600 transition-colors" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all depth-3d-input"
                        required
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Email Field */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Email ID
                    <span className="text-slate-500 font-normal ml-1">(Registered email)</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl opacity-0 group-focus-within:opacity-10 blur transition-opacity" />
                    <div className="relative flex items-center">
                      <Mail className="absolute left-4 size-5 text-slate-400 group-focus-within:text-orange-600 transition-colors" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your registered email"
                        pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                        title="Email must contain @ and a domain (e.g., .com, .org)"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all depth-3d-input"
                        required
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Previous Password Field (Optional) */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                >
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Previous Password
                    <span className="text-slate-500 font-normal ml-1">(Optional)</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl opacity-0 group-focus-within:opacity-10 blur transition-opacity" />
                    <div className="relative flex items-center">
                      <Lock className="absolute left-4 size-5 text-slate-400 group-focus-within:text-orange-600 transition-colors z-10" />
                      <input
                        type={showPreviousPassword ? 'text' : 'password'}
                        value={previousPassword}
                        onChange={(e) => setPreviousPassword(e.target.value)}
                        placeholder="Enter previous password if known"
                        className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all depth-3d-input"
                      />
                      <motion.button
                        type="button"
                        onClick={() => setShowPreviousPassword(!showPreviousPassword)}
                        className="absolute right-4 p-1 text-slate-400 hover:text-orange-600 transition-colors z-10"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {showPreviousPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </motion.button>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Fill only if you remember your old password
                  </p>
                </motion.div>

                {/* New Password Field */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    New Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl opacity-0 group-focus-within:opacity-10 blur transition-opacity" />
                    <div className="relative flex items-center">
                      <Lock className="absolute left-4 size-5 text-slate-400 group-focus-within:text-orange-600 transition-colors z-10" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter your new password"
                        className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all depth-3d-input"
                        required
                        minLength="8"
                      />
                      <motion.button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 p-1 text-slate-400 hover:text-orange-600 transition-colors z-10"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {showNewPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </motion.button>
                    </div>
                  </div>
                  {newPassword && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className={`mt-1.5 text-xs font-medium ${passwordStrength.color}`}
                    >
                      Password strength: {passwordStrength.text}
                    </motion.p>
                  )}
                </motion.div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full relative group mt-8"
                  whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                  whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.75 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-600/30">
                    {isSubmitting ? (
                      <>
                        <motion.div
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Request
                        <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </div>
                </motion.button>
              </motion.form>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-orange-200/50 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              © 2026 Zyndex • A ScholarSphere Digital Company • All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link to="/Zyndex/Legal/Privacy" className="text-sm text-slate-600 hover:text-orange-600 transition-colors">
                Privacy
              </Link>
              <Link to="/Zyndex/Legal/Terms" className="text-sm text-slate-600 hover:text-orange-600 transition-colors">
                Terms
              </Link>
              <Link to="/Zyndex/Support/FAQ" className="text-sm text-slate-600 hover:text-orange-600 transition-colors">
                FAQ
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
