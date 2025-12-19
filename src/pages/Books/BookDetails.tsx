import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, BookmarkIcon, UserCircleIcon, ChatBubbleLeftIcon, ArrowPathIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

interface BookDetails {
    _id: string;
    title: string;
    author: string;
    genre: string;
    condition: string;
    description: string;
    coverImage: string;
    status: string;
    owner: {
        id: string;
        fullname: string;
        userid: string;
        address: string;
    };
}

const BookDetails = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [book, setBook] = useState<BookDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRequesting, setIsRequesting] = useState(false);
    const [requestMessage, setRequestMessage] = useState('');

    const fetchBook = async () => {
        try {
            const res = await api.get(`/books/${id}`);
            setBook(res.data);
        } catch (err) {
            toast.error('Failed to load book details');
            navigate('/browse');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBook();
    }, [id]);

    const handleRequest = async () => {
        if (!user) {
            toast.error('Please log in to request books');
            return navigate('/login');
        }

        setIsRequesting(true);
        try {
            await api.post('/requests', {
                bookId: book?._id,
                ownerId: book?.owner?.id,
                message: requestMessage
            });
            toast.success('Request sent successfully!');
            setRequestMessage('');
            fetchBook(); // Refresh status
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to request book');
        } finally {
            setIsRequesting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-32 min-h-screen">
                <ArrowPathIcon className="h-10 w-10 text-primary animate-spin" />
            </div>
        );
    }

    if (!book) return null;

    const isOwner = user?.id === book.owner.id;

    return (
        <div className="container mx-auto px-4 py-24">
            <Link to="/browse" className="inline-flex items-center gap-2 text-text-light hover:text-primary mb-12 transition-colors">
                <ArrowLeftIcon className="w-4 h-4" />
                Back to browse
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                {/* Left: Book Cover & Quick Info */}
                <div className="lg:col-span-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-3xl overflow-hidden shadow-2xl border border-gray-100 sticky top-24"
                    >
                        {book.coverImage ? (
                            <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="aspect-[2/3] bg-secondary/30 flex items-center justify-center">
                                <BookmarkIcon className="h-16 w-16 text-gray-300" />
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Right: Detailed Info & Actions */}
                <div className="lg:col-span-8">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                            <span className="px-4 py-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest rounded-full">
                                {book.genre || 'Uncategorized'}
                            </span>
                            <span className={`px-4 py-1 text-xs font-bold uppercase tracking-widest rounded-full ${book.status === 'available' ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'
                                }`}>
                                {book.status}
                            </span>
                        </div>

                        <h1 className="text-5xl font-serif font-bold text-primary-dark mb-4">{book.title}</h1>
                        <p className="text-2xl text-text-light italic mb-10">by {book.author}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-8 border-y border-gray-100 mb-10">
                            <div>
                                <p className="text-[10px] text-text-light uppercase tracking-widest font-bold mb-1">Condition</p>
                                <p className="font-bold text-primary-dark">{book.condition}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-text-light uppercase tracking-widest font-bold mb-1">Format</p>
                                <p className="font-bold text-primary-dark">Paperback</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-text-light uppercase tracking-widest font-bold mb-1">Language</p>
                                <p className="font-bold text-primary-dark">English</p>
                            </div>
                        </div>

                        <div className="mb-12">
                            <h3 className="text-xl font-serif font-bold text-primary-dark mb-4">Synopsis</h3>
                            <p className="text-text-light leading-relaxed text-lg whitespace-pre-line">
                                {book.description || 'No description available for this title.'}
                            </p>
                        </div>

                        {/* Owner & Interaction Card */}
                        <div className="p-8 bg-white border border-gray-100 shadow-sm rounded-3xl mb-12">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center text-primary">
                                        <UserCircleIcon className="w-10 h-10" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-primary-dark text-lg">Shared by {book.owner.fullname}</h4>
                                        <div className="flex items-center gap-1 text-sm text-text-light">
                                            <MapPinIcon className="h-4 w-4" />
                                            <span>{book.owner.address}</span>
                                        </div>
                                    </div>
                                </div>
                                {!isOwner && (
                                    <button className="text-primary font-bold hover:underline">View Library</button>
                                )}
                            </div>

                            {!isOwner ? (
                                <>
                                    <textarea
                                        placeholder="Send a nice message to the owner..."
                                        className="w-full p-4 rounded-2xl border border-secondary bg-secondary/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all mb-4 min-h-[100px]"
                                        value={requestMessage}
                                        onChange={(e) => setRequestMessage(e.target.value)}
                                        disabled={book.status !== 'available'}
                                    />
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <button
                                            onClick={handleRequest}
                                            disabled={isRequesting || book.status !== 'available'}
                                            className="flex-grow btn btn-primary py-4 text-lg flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                                        >
                                            {isRequesting ? (
                                                <ArrowPathIcon className="h-6 w-6 animate-spin" />
                                            ) : (
                                                <>
                                                    <ChatBubbleLeftIcon className="w-5 h-5" />
                                                    {book.status === 'available' ? 'Request for 10 Credits' : 'Not Available'}
                                                </>
                                            )}
                                        </button>
                                        <button className="btn btn-outline py-4 px-6 border-gray-200">
                                            <BookmarkIcon className="w-6 h-6" />
                                        </button>
                                    </div>
                                    <p className="mt-4 text-[10px] text-text-light text-center">
                                        Requesting costs 10 credits. You keep the book after the exchange.
                                    </p>
                                </>
                            ) : (
                                <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
                                    <p className="text-primary font-bold text-center">This is your book!</p>
                                    <Link to="/my-books" className="block text-center text-sm text-primary hover:underline mt-2">
                                        Manage your collection
                                    </Link>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default BookDetails;
