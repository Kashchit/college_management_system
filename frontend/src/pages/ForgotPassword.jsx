import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import Toast from '../components/Toast';
import { Mail, ArrowLeft, Loader } from 'lucide-react';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setToast(null);

        try {
            await api.post('/auth/forgot-password', { email });
            setSent(true);
            setToast({ message: 'Reset link sent to your email', type: 'success' });
        } catch (error) {
            setToast({
                message: error.response?.data?.message || 'Failed to send reset link',
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
                            Reset Password
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            {sent
                                ? `Check your email (${email}) for the reset link`
                                : 'Enter your email to receive a password reset link'}
                        </p>
                    </div>

                    {!sent ? (
                        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-[#ef4444] to-[#dc2626] hover:from-[#dc2626] hover:to-[#b91c1c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover-lift shadow-lg"
                            >
                                {loading ? <Loader className="animate-spin" /> : 'Send Reset Link'}
                            </button>

                            <div className="flex items-center justify-center">
                                <Link to="/login" className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back to Login
                                </Link>
                            </div>
                        </form>
                    ) : (
                        <div className="mt-8 space-y-6">
                            <div className="text-center">
                                <p className="text-sm text-gray-500 mb-6">
                                    Didn't receive the email? Check your spam folder or try again.
                                </p>
                                <button
                                    onClick={() => setSent(false)}
                                    className="text-[#dc2626] hover:text-[#b91c1c] font-medium transition-colors"
                                >
                                    Try another email
                                </button>
                            </div>
                            <div className="flex items-center justify-center border-t pt-6">
                                <Link to="/login" className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back to Login
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
