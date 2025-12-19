import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon, BookOpenIcon, ArrowPathIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

interface Book {
    _id: string;
    title: string;
    author: string;
    genre: string;
    coverImage: string;
    condition: string;
    owner?: {
        fullname: string;
        userid: string;
        address: string;
    };
}

const Browse = () => {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    const categories = ['All', 'Fiction', 'Thriller', 'Memoir', 'Self-Help', 'Fantasy', 'History', 'Sci-Fi'];

    const fetchBooks = async () => {
        try {
            setLoading(true);
            const res = await api.get('/browse', {
                params: {
                    search: searchTerm,
                    genre: activeCategory
                }
            });
            setBooks(res.data);
        } catch (err) {
            console.error('Failed to fetch books', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Debounce search
        const timer = setTimeout(() => {
            fetchBooks();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, activeCategory]);

    return (
        <div className="pt-24 pb-12 min-h-screen bg-secondary/10">
            <div className="container mx-auto px-4">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                    <div>
                        <h1 className="text-4xl font-serif font-bold text-primary-dark mb-2">Explore the Collection</h1>
                        <p className="text-text-light">Discover books being shared by readers in your community.</p>
                    </div>

                    <div className="relative w-full max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                            <MagnifyingGlassIcon className="h-5 w-5" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by title or author..."
                            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-white bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Categories Section */}
                <div className="flex flex-wrap gap-3 mb-12 scrollbar-hide">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all transform hover:scale-105 active:scale-95 ${activeCategory === cat
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'bg-white text-text-light border border-gray-100 hover:border-primary/30 shadow-sm'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Books Grid */}
                {loading ? (
                    <div className="flex justify-center items-center py-32">
                        <ArrowPathIcon className="h-10 w-10 text-primary animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 lg:gap-8">
                        <AnimatePresence>
                            {books.map((book) => (
                                <motion.div
                                    key={book._id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="group"
                                >
                                    <Link to={`/book/${book._id}`}>
                                        <div className="aspect-[2/3] rounded-2xl overflow-hidden mb-4 shadow-sm group-hover:shadow-2xl transition-all duration-500 relative bg-white">
                                            {book.coverImage ? (
                                                <img
                                                    src={book.coverImage}
                                                    alt={book.title}
                                                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                                                    <BookOpenIcon className="h-12 w-12 text-gray-300" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-4">
                                                <div className="flex items-center gap-1 text-[10px] text-white/80 mb-2">
                                                    <MapPinIcon className="h-3 w-3" />
                                                    <span className="truncate">{book.owner?.address.split(',')[0]}</span>
                                                </div>
                                                <button className="btn btn-primary w-full py-2 text-xs flex items-center justify-center gap-2">
                                                    View Details
                                                </button>
                                            </div>
                                        </div>
                                    </Link>
                                    <h3 className="font-serif font-bold text-primary-dark truncate mb-1 group-hover:text-primary transition-colors">
                                        {book.title}
                                    </h3>
                                    <p className="text-xs text-text-light mb-2">{book.author}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-accent bg-accent/5 px-2 py-0.5 rounded">
                                            {book.genre || 'Fiction'}
                                        </span>
                                        <span className="text-[10px] text-text-light opacity-60">
                                            {book.condition}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {!loading && books.length === 0 && (
                    <div className="text-center py-32 bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <BookOpenIcon className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                        <h3 className="text-xl font-serif font-bold text-primary-dark mb-2">No books found</h3>
                        <p className="text-text-light max-w-sm mx-auto">
                            We couldn't find any books matching your criteria. Try different filters or search terms.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Browse;
