import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { auth } from '../utils/api';
import Toast from '../components/Toast';
import { Mail, Lock, Key, ArrowRight, Loader } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [step, setStep] = useState(1); // 1: Credentials, 2: OTP
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setToast(null);

    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.requireOtp) {
        setStep(2);
        setToast({ message: 'OTP sent to your email', type: 'success' });
      } else {
        // Fallback if OTP not required (shouldn't happen with current backend)
        auth.setSession(response.data.token, response.data.user);
        if (onLogin) onLogin(response.data.user);
        navigate('/dashboard');
      }
    } catch (error) {
      setToast({
        message: error.response?.data?.message || 'Login failed',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setToast(null);

    try {
      const response = await api.post('/auth/verify-login-otp', { email, otp });
      auth.setSession(response.data.token, response.data.user);
      if (onLogin) onLogin(response.data.user);
      setToast({ message: 'Login successful!', type: 'success' });
      setTimeout(() => navigate('/dashboard'), 600);
    } catch (error) {
      setToast({
        message: error.response?.data?.message || 'Invalid OTP',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-md w-full space-y-8 animate-slide-up">
        <div className="bg-white rounded-2xl shadow-2xl p-8 card-shadow">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#ef4444] to-[#dc2626] rounded-xl flex items-center justify-center mb-4 shadow-lg">
              <span className="text-white text-2xl font-bold">CMS</span>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              {step === 1 ? 'Welcome Back' : 'Verify Identity'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {step === 1 ? 'Sign in to your College Management System' : `Enter the OTP sent to ${email}`}
            </p>
          </div>

          {step === 1 ? (
            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-black bg-white"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-black bg-white"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Link to="/forgot-password" className="text-sm text-gray-600 hover:text-primary-600 transition-colors">
                  Forgot password?
                </Link>
                <Link to="/signup" className="text-sm text-[#dc2626] hover:text-primary-700 font-medium transition-colors">
                  Create account
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-[#ef4444] to-[#dc2626] hover:from-[#dc2626] hover:to-[#b91c1c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover-lift shadow-lg"
              >
                {loading ? <Loader className="animate-spin" /> : 'Sign In'}
              </button>
            </form>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleVerifyOtp}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">One-Time Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all tracking-widest text-center text-lg font-mono text-black bg-white"
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-[#ef4444] to-[#dc2626] hover:from-[#dc2626] hover:to-[#b91c1c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover-lift shadow-lg"
              >
                {loading ? <Loader className="animate-spin" /> : 'Verify & Login'}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
