import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlusIcon, BookOpenIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';

interface Book {
    _id: string;
    title: string;
    author: string;
    genre: string;
    condition: string;
    coverImage: string;
    status: string;
}

const MyBooks = () => {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [newBook, setNewBook] = useState({
        title: '',
        author: '',
        genre: '',
        condition: 'Good',
        description: ''
    });

    const fetchBooks = async () => {
        try {
            const res = await api.get('/my-books');
            setBooks(res.data);
        } catch (err) {
            toast.error('Failed to load books');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBooks();
    }, []);

    const handleAddBook = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/books', newBook);
            toast.success('Book added successfully!');
            setShowAddModal(false);
            setNewBook({ title: '', author: '', genre: '', condition: 'Good', description: '' });
            fetchBooks();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to add book');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (bookId: string) => {
        if (!window.confirm('Are you sure you want to delete this book?')) return;

        try {
            await api.delete(`/books/${bookId}`);
            toast.success('Book deleted successfully');
            fetchBooks();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to delete book');
        }
    };

    return (
        <div className="pt-24 pb-12 min-h-screen bg-secondary/20">
            <div className="container px-4 mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                    <div>
                        <h1 className="text-4xl font-serif font-bold text-primary-dark mb-2">My Collection</h1>
                        <p className="text-text-light">Manage your library and share your stories with others.</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn btn-primary flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                        <PlusIcon className="h-5 w-5" />
                        Add New Book
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                            <ArrowPathIcon className="h-10 w-10 text-primary" />
                        </motion.div>
                    </div>
                ) : books.length === 0 ? (
                    <div className="bg-white rounded-3xl p-20 text-center shadow-sm border border-gray-100">
                        <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
                            <BookOpenIcon className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-2xl font-serif font-bold text-primary-dark mb-2">Your library is empty</h3>
                        <p className="text-text-light max-w-sm mx-auto mb-8">
                            Start by adding books you're willing to exchange with the community.
                        </p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn btn-outline"
                        >
                            Add your first book
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {books.map((book) => (
                            <motion.div
                                key={book._id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex h-48"
                            >
                                <div className="w-1/3 bg-gray-100 relative overflow-hidden">
                                    {book.coverImage ? (
                                        <img
                                            src={book.coverImage}
                                            alt={book.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <BookOpenIcon className="h-10 w-10 text-gray-300" />
                                        </div>
                                    )}
                                </div>
                                <div className="w-2/3 p-6 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-serif font-bold text-primary-dark truncate" title={book.title}>
                                                {book.title}
                                            </h3>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${book.status === 'available' ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'
                                                }`}>
                                                {book.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-text-light mb-2">{book.author}</p>
                                        <p className="text-xs text-text-light/60">{book.genre}</p>
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <span className="text-xs font-medium text-primary bg-primary/5 px-2 py-1 rounded">
                                            {book.condition}
                                        </span>
                                        <button
                                            onClick={() => handleDelete(book._id)}
                                            className="p-2 text-danger hover:bg-danger/5 rounded-lg transition-colors"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Book Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-primary-dark/40 backdrop-blur-sm"
                        onClick={() => setShowAddModal(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl relative z-10"
                    >
                        <h2 className="text-2xl font-serif font-bold text-primary-dark mb-6">Add a Book</h2>
                        <form onSubmit={handleAddBook} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text mb-1">Title</label>
                                <input
                                    required
                                    value={newBook.title}
                                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                                    className="input"
                                    placeholder="The Great Gatsby"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text mb-1">Author</label>
                                <input
                                    required
                                    value={newBook.author}
                                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                                    className="input"
                                    placeholder="F. Scott Fitzgerald"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text mb-1">Genre</label>
                                    <input
                                        value={newBook.genre}
                                        onChange={(e) => setNewBook({ ...newBook, genre: e.target.value })}
                                        className="input"
                                        placeholder="Fiction"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text mb-1">Condition</label>
                                    <select
                                        value={newBook.condition}
                                        onChange={(e) => setNewBook({ ...newBook, condition: e.target.value })}
                                        className="input"
                                    >
                                        <option>Like New</option>
                                        <option>Good</option>
                                        <option>Fair</option>
                                        <option>Poor</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text mb-1">Description</label>
                                <textarea
                                    value={newBook.description}
                                    onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                                    className="input min-h-[100px]"
                                    placeholder="Briefly describe the story or condition..."
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 btn btn-outline"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 btn btn-primary flex justify-center items-center gap-2"
                                >
                                    {isSubmitting ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : 'Add Book'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default MyBooks;
