import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const Login = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const { login } = useAuth();
    const navigate = useNavigate();

    const onSubmit = async (data: any) => {
        try {
            const res = await api.post('/login', {
                identifier: data.email,
                password: data.password
            });
            login(res.data.user);
            toast.success('Successfully logged in!');
            navigate('/');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Login failed');
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 bg-secondary/20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full"
            >
                <div className="bg-white p-10 rounded-3xl shadow-xl shadow-primary/5 border border-gray-100">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-serif font-bold text-primary-dark mb-4">Welcome back</h2>
                        <p className="text-text-light">
                            Enter your details to access your book collection.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-text-light mb-2 ml-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <EnvelopeIcon className="h-5 w-5" />
                                </div>
                                <input
                                    {...register('email', { required: 'Email is required' })}
                                    type="email"
                                    className={`input pl-10 ${errors.email ? 'border-red-400' : 'border-gray-200'}`}
                                    placeholder="name@example.com"
                                />
                            </div>
                            {errors.email && <p className="mt-1 text-xs text-red-500 ml-1">{(errors.email as any).message}</p>}
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2 ml-1">
                                <label className="text-sm font-medium text-text-light ">
                                    Password
                                </label>
                                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <LockClosedIcon className="h-5 w-5" />
                                </div>
                                <input
                                    {...register('password', { required: 'Password is required' })}
                                    type="password"
                                    className={`input pl-10 ${errors.password ? 'border-red-400' : 'border-gray-200'}`}
                                    placeholder="••••••••"
                                />
                            </div>
                            {errors.password && <p className="mt-1 text-xs text-red-500 ml-1">{(errors.password as any).message}</p>}
                        </div>

                        <div className="flex items-center ml-1">
                            <input
                                id="remember-me"
                                type="checkbox"
                                className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-text-light">
                                Keep me logged in
                            </label>
                        </div>

                        <button type="submit" className="w-full btn btn-primary py-3 text-lg font-bold shadow-lg shadow-primary/20 mt-4 transition-all hover:scale-[1.02]">
                            Log in
                        </button>
                    </form>

                    <div className="mt-10 pt-10 border-t border-gray-100 text-center">
                        <p className="text-sm text-text-light">
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-primary font-bold hover:underline">
                                Sign up for free
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
