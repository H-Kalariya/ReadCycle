import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bars3Icon, XMarkIcon, BookOpenIcon, UserCircleIcon, ArrowRightOnRectangleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useAuth();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Browse', path: '/browse' },
        { name: 'My Books', path: '/my-books' },
        { name: 'My Reads', path: '/my-reads' },
        { name: 'Requests', path: '/requests' },
    ];

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'
                }`}
        >
            <div className="container px-4 mx-auto flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                        <BookOpenIcon className="h-6 w-6" />
                    </div>
                    <span className="text-xl font-serif font-bold text-primary-dark tracking-tight">BookCycle</span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            to={link.path}
                            className="text-sm font-medium text-text-light hover:text-primary transition-colors relative group"
                        >
                            {link.name}
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                        </Link>
                    ))}
                </div>

                {/* Auth Buttons */}
                <div className="hidden md:flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-4 bg-secondary/50 px-3 py-1.5 rounded-xl border border-secondary">
                                <div className="flex items-center gap-2 text-sm font-medium text-text">
                                    <UserCircleIcon className="h-5 w-5 text-primary" />
                                    <span>{user.fullname}</span>
                                </div>
                                <div className="h-4 w-px bg-secondary-dark/20"></div>
                                <div className="flex items-center gap-1.5">
                                    <SparklesIcon className="h-4 w-4 text-accent" />
                                    <span className="text-sm font-bold text-primary-dark">{user.credits}</span>
                                    <span className="text-[10px] uppercase tracking-wider text-text-light font-bold">Credits</span>
                                </div>
                            </div>
                            <button
                                onClick={logout}
                                className="flex items-center gap-1 text-sm font-medium text-danger hover:text-danger/80 transition-colors"
                            >
                                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                                Logout
                            </button>
                        </div>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="text-sm font-medium text-text-light hover:text-primary transition-colors"
                            >
                                Log in
                            </Link>
                            <Link
                                to="/signup"
                                className="btn btn-primary shadow-lg shadow-primary/20"
                            >
                                Get Started
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 text-text-light hover:text-primary transition-colors"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-white border-t border-gray-100 overflow-hidden"
                    >
                        <div className="container px-4 py-6 flex flex-col gap-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    className="text-lg font-medium text-text hover:text-primary transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <div className="pt-4 flex flex-col gap-4 border-t border-gray-100">
                                {user ? (
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between bg-secondary/50 p-4 rounded-2xl border border-secondary shadow-sm">
                                            <div className="flex items-center gap-2 font-medium text-text">
                                                <UserCircleIcon className="h-6 w-6 text-primary" />
                                                <span>{user.fullname}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <SparklesIcon className="h-5 w-5 text-accent" />
                                                <span className="text-lg font-bold text-primary-dark">{user.credits}</span>
                                                <span className="text-[10px] uppercase tracking-wider text-text-light font-bold">Credits</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                logout();
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className="flex items-center gap-2 p-4 text-lg font-medium text-danger bg-danger/5 rounded-2xl border border-danger/10"
                                        >
                                            <ArrowRightOnRectangleIcon className="h-6 w-6" />
                                            Logout
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Link
                                            to="/login"
                                            className="text-lg font-medium text-text"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            Log in
                                        </Link>
                                        <Link
                                            to="/signup"
                                            className="btn btn-primary text-center"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            Get Started
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;
