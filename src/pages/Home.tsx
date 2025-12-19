import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, BookOpenIcon, UserGroupIcon, GlobeAltIcon, SparklesIcon } from '@heroicons/react/24/outline';
import api from '../utils/api';

const Home = () => {
    return (
        <div className="overflow-hidden">
            {/* Hero Section */}
            <section className="relative pt-20 pb-24 lg:pt-32 lg:pb-36 bg-gradient-to-br from-secondary to-primary/5">
                <div className="container mx-auto px-6 lg:px-12 xl:px-24 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
                    <div className="w-full lg:w-1/2 text-center lg:text-left lg:pl-4 xl:pl-8">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <span className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wide text-primary uppercase bg-primary/10 rounded-full">
                                Eco-Friendly Book Sharing
                            </span>
                            <h1 className="text-5xl lg:text-7xl font-serif text-primary-dark leading-tight mb-8">
                                Every book <br />
                                <span className="text-accent italic">deserves</span> a <br />
                                second reader.
                            </h1>
                            <p className="text-lg text-text-light mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                                Join our community of book lovers and exchange your favorites with people nearby. Reduce waste, discover hidden gems, and start your next adventure.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                                <Link to="/browse" className="btn btn-primary px-8 py-4 rounded-2xl flex items-center gap-2 group shadow-xl shadow-primary/20">
                                    Browse Collection
                                    <ArrowRightIcon className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <Link to="/signup" className="btn btn-outline px-8 py-4 rounded-2xl">
                                    Join Community
                                </Link>
                            </div>
                        </motion.div>
                    </div>

                    <div className="w-full lg:w-1/2 relative lg:pr-4 xl:pr-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.7, delay: 0.2 }}
                            className="relative z-10 rounded-3xl overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500"
                        >
                            <div className="relative group">
                                <img
                                    src="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=1200"
                                    alt="Cozy library"
                                    className="w-full h-[500px] object-cover rounded-2xl transform group-hover:scale-105 transition-transform duration-700 ease-in-out"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            </div>
                        </motion.div>
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl"></div>
                        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-primary/20 rounded-full blur-3xl"></div>
                    </div>
                </div>
            </section>

            {/* Recommendations Section */}
            <FeaturedRecs />

            {/* Stats/Features Section */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {[
                            {
                                icon: BookOpenIcon,
                                title: "10,000+ Books",
                                desc: "A vast collection of titles across all genres waiting for you."
                            },
                            {
                                icon: UserGroupIcon,
                                title: "Active Community",
                                desc: "Connect with thousands of fellow readers in your area."
                            },
                            {
                                icon: GlobeAltIcon,
                                title: "Sustainable Living",
                                desc: "Give books a new life and reduce your carbon footprint."
                            }
                        ].map((feature, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ y: -5 }}
                                className="p-8 rounded-2xl bg-secondary/50 border border-gray-100"
                            >
                                <feature.icon className="w-12 h-12 text-primary mb-6" />
                                <h3 className="text-xl font-bold text-primary-dark mb-4">{feature.title}</h3>
                                <p className="text-text-light leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

interface Recommendation {
    title: string;
    authors: string[];
    coverImage: string;
    description: string;
    averageRating?: number;
    recommendationType: string;
    matchReason: string;
}

const FeaturedRecs = () => {
    const [recs, setRecs] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecs = async () => {
            try {
                // We attempt to fetch recommendations (works if logged in, falls back to trending)
                const res = await api.get('/recommendations');
                setRecs(res.data.slice(0, 4));
            } catch (err) {
                console.error("Home recs fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRecs();
    }, []);

    if (loading || recs.length === 0) return null;

    return (
        <section className="py-24 bg-secondary/10">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <SparklesIcon className="h-5 w-5 text-accent" />
                            <span className="text-sm font-bold text-accent uppercase tracking-widest">Selected for you</span>
                        </div>
                        <h2 className="text-3xl font-serif font-bold text-primary-dark">Trending Now</h2>
                    </div>
                    <Link to="/browse" className="text-primary font-bold flex items-center gap-2 hover:translate-x-1 transition-transform">
                        View More <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {recs.map((book, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white p-4 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 group"
                        >
                            <div className="aspect-[2/3] rounded-2xl overflow-hidden mb-4 shadow-sm group-hover:shadow-md transition-all">
                                {book.coverImage ? (
                                    <img src={book.coverImage} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" alt={book.title} />
                                ) : (
                                    <div className="w-full h-full bg-secondary/30 flex items-center justify-center">
                                        <BookOpenIcon className="h-10 w-10 text-gray-300" />
                                    </div>
                                )}
                            </div>
                            <h3 className="font-serif font-bold text-primary-dark truncate mb-1">{book.title}</h3>
                            <p className="text-xs text-text-light truncate">{book.authors?.join(', ') || 'Unknown Author'}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Home;
