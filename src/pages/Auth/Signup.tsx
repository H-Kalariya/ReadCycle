import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { EnvelopeIcon, LockClosedIcon, UserIcon, IdentificationIcon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const Signup = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const { login } = useAuth();
    const navigate = useNavigate();

    const onSubmit = async (data: any) => {
        try {
            if (data.password !== data.verifyPassword) {
                return toast.error('Passwords do not match');
            }
            const res = await api.post('/signup', {
                fullname: data.name,
                userid: data.userid,
                no: data.phone,
                email: data.email,
                address: data.address,
                password: data.password,
                verifyPassword: data.verifyPassword
            });
            login(res.data.user);
            toast.success('Account created successfully!');
            navigate('/');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Signup failed');
        }
    };

    return (
        <div className="min-h-[90vh] flex items-center justify-center py-12 px-4 bg-secondary/20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full"
            >
                <div className="bg-white p-10 rounded-3xl shadow-xl shadow-primary/5 border border-gray-100">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-serif font-bold text-primary-dark mb-4">Start your journey</h2>
                        <p className="text-text-light">
                            Join our community and start exchanging stories today.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-text-light mb-2 ml-1">
                                Full Name
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <UserIcon className="h-5 w-5" />
                                </div>
                                <input
                                    {...register('name', { required: 'Full name is required' })}
                                    type="text"
                                    className={`input pl-10 ${errors.name ? 'border-red-400' : 'border-gray-200'}`}
                                    placeholder="John Doe"
                                />
                            </div>
                            {errors.name && <p className="mt-1 text-xs text-red-500 ml-1">{(errors.name as any).message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text mb-2">User ID</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <IdentificationIcon className="h-5 w-5 text-text-light" />
                                </div>
                                <input
                                    {...register('userid', { required: 'User ID is required' })}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-secondary bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                                    placeholder="choose_a_username"
                                />
                            </div>
                            {errors.userid && <p className="mt-1 text-xs text-red-500 ml-1">{errors.userid.message as string}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text mb-2">Phone Number</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <PhoneIcon className="h-5 w-5 text-text-light" />
                                </div>
                                <input
                                    {...register('phone', { required: 'Phone number is required' })}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-secondary bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                                    placeholder="+91 XXXXX XXXXX"
                                />
                            </div>
                            {errors.phone && <p className="mt-1 text-xs text-red-500 ml-1">{errors.phone.message as string}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text mb-2">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <EnvelopeIcon className="h-5 w-5 text-text-light" />
                                </div>
                                <input
                                    {...register('email', {
                                        required: 'Email is required',
                                        pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
                                    })}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-secondary bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                                    placeholder="you@example.com"
                                />
                            </div>
                            {errors.email && <p className="mt-1 text-xs text-red-500 ml-1">{errors.email.message as string}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text mb-2">Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MapPinIcon className="h-5 w-5 text-text-light" />
                                </div>
                                <textarea
                                    {...register('address', { required: 'Address is required' })}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-secondary bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                                    placeholder="Your pickup/exchange address"
                                    rows={2}
                                />
                            </div>
                            {errors.address && <p className="mt-1 text-xs text-red-500 ml-1">{errors.address.message as string}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text mb-2">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <LockClosedIcon className="h-5 w-5 text-text-light" />
                                </div>
                                <input
                                    type="password"
                                    {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 chars' } })}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-secondary bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                                    placeholder="••••••••"
                                />
                            </div>
                            {errors.password && <p className="mt-1 text-xs text-red-500 ml-1">{errors.password.message as string}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text mb-2">Confirm Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <LockClosedIcon className="h-5 w-5 text-text-light" />
                                </div>
                                <input
                                    type="password"
                                    {...register('verifyPassword', { required: 'Please confirm your password' })}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-secondary bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                                    placeholder="••••••••"
                                />
                            </div>
                            {errors.verifyPassword && <p className="mt-1 text-xs text-red-500 ml-1">{errors.verifyPassword.message as string}</p>}
                        </div>

                        <p className="text-[10px] text-text-light leading-relaxed ml-1">
                            By creating an account, you agree to our Terms of Service and Privacy Policy.
                        </p>

                        <button type="submit" className="w-full btn btn-primary py-3 text-lg font-bold shadow-lg shadow-primary/20 mt-4 transition-all hover:scale-[1.02]">
                            Create Account
                        </button>
                    </form>

                    <div className="mt-10 pt-10 border-t border-gray-100 text-center">
                        <p className="text-sm text-text-light">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary font-bold hover:underline">
                                Log in here
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Signup;
