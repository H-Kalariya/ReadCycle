import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpenIcon, SparklesIcon, PlusIcon, ArrowPathIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';

interface ReadBook {
    _id: string;
    title: string;
    author: string;
    genre: string;
    ideas: string;
    readAt: string;
}

interface Recommendation {
    title: string;
    authors: string[];
    coverImage: string;
    description: string;
    averageRating?: number;
    recommendationType: string;
    matchReason: string;
}

const MyReads = () => {
    const [reads, setReads] = useState<ReadBook[]>([]);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'reads' | 'picks'>('reads');
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [newRead, setNewRead] = useState({
        title: '',
        author: '',
        genre: '',
        ideas: ''
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [readsRes, recsRes] = await Promise.all([
                api.get('/reads'),
                api.get('/recommendations')
            ]);
            setReads(readsRes.data);
            setRecommendations(recsRes.data);
        } catch (err) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleLogRead = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/reads', newRead);
            toast.success('Read logged successfully!');
            setShowAddModal(false);
            setNewRead({ title: '', author: '', genre: '', ideas: '' });
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to log read');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="pt-24 pb-12 min-h-screen bg-secondary/20">
            <div className="container px-4 mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <h1 className="text-4xl font-serif font-bold text-primary-dark mb-2">Reading Journey</h1>
                        <p className="text-text-light">Track your progress and discover your next favorite book.</p>
                    </div>
                    <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
                        <button
                            onClick={() => setActiveTab('reads')}
                            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'reads' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-light hover:text-primary'
                                }`}
                        >
                            My Reads
                        </button>
                        <button
                            onClick={() => setActiveTab('picks')}
                            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'picks' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-light hover:text-accent'
                                }`}
                        >
                            <SparklesIcon className="h-4 w-4" />
                            Smart Picks
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <ArrowPathIcon className="h-10 w-10 text-primary animate-spin" />
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {activeTab === 'reads' ? (
                            <motion.div
                                key="reads"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-serif font-bold text-primary-dark">Books I've Finished</h2>
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        className="btn btn-primary btn-sm flex items-center gap-2"
                                    >
                                        <PlusIcon className="h-4 w-4" /> Log a Read
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {reads.length === 0 ? (
                                        <div className="col-span-full bg-white p-12 rounded-3xl text-center border border-dashed border-gray-300">
                                            <BookmarkIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                            <p className="text-text-light">No books logged yet. Share what you've read to get smarter recommendations!</p>
                                        </div>
                                    ) : (
                                        reads.map((read) => (
                                            <div key={read._id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="font-serif font-bold text-primary-dark text-lg">{read.title}</h3>
                                                        <p className="text-sm text-text-light">by {read.author}</p>
                                                    </div>
                                                    <span className="text-[10px] text-text-light opacity-60">
                                                        {new Date(read.readAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                {read.ideas && (
                                                    <div className="bg-secondary/30 p-4 rounded-xl">
                                                        <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Key Takeaways</h4>
                                                        <p className="text-sm text-text italic">"{read.ideas}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="picks"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                <h2 className="text-2xl font-serif font-bold text-primary-dark">Personalized for You</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {recommendations.length === 0 ? (
                                        <div className="col-span-full text-center py-10">
                                            <p className="text-text-light">Not enough reading history for recommendations yet.</p>
                                        </div>
                                    ) : (
                                        recommendations.map((rec, i) => (
                                            <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <span className="text-[10px] bg-accent/10 text-accent font-bold px-2 py-0.5 rounded-full uppercase">
                                                        {rec.recommendationType}
                                                    </span>
                                                </div>
                                                <div className="flex gap-4">
                                                    <div className="w-24 h-32 bg-gray-100 rounded-xl overflow-hidden shadow-sm shrink-0">
                                                        {rec.coverImage ? (
                                                            <img src={rec.coverImage} className="w-full h-full object-cover" alt={rec.title} />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <BookOpenIcon className="h-8 w-8 text-gray-300" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-serif font-bold text-primary-dark leading-tight mb-1 group-hover:text-primary transition-colors truncate">
                                                            {rec.title}
                                                        </h4>
                                                        <p className="text-sm text-text-light mb-2 truncate">{rec.authors.join(', ')}</p>
                                                        <p className="text-xs text-text-light/60 line-clamp-3">{rec.matchReason}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
                <div className="mt-20 border-t border-gray-100 pt-16">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        {/* Tech Stack */}
                        <section>
                            <h2 className="text-3xl font-serif font-bold text-primary-dark mb-8 flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <ArrowPathIcon className="h-6 w-6 text-primary" />
                                </div>
                                Built with Modern Tech
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {[
                                    { name: 'React', desc: 'UI Library' },
                                    { name: 'TypeScript', desc: 'Type Safety' },
                                    { name: 'Tailwind CSS', desc: 'Modern Styling' },
                                    { name: 'Node.js', desc: 'Server Env' },
                                    { name: 'Express', desc: 'REST API' },
                                    { name: 'MongoDB', desc: 'Database' },
                                    { name: 'Mongoose', desc: 'ODM Layer' },
                                    { name: 'Framer Motion', desc: 'Animations' },
                                    { name: 'Check-GPT', desc: 'Smart Recs' }
                                ].map((tech) => (
                                    <div key={tech.name} className="bg-white p-4 rounded-2xl border border-gray-50 shadow-sm hover:shadow-md transition-shadow">
                                        <h4 className="font-bold text-primary-dark text-sm">{tech.name}</h4>
                                        <p className="text-[10px] text-text-light">{tech.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Features */}
                        <section>
                            <h2 className="text-3xl font-serif font-bold text-primary-dark mb-8 flex items-center gap-3">
                                <div className="p-2 bg-accent/10 rounded-lg">
                                    <SparklesIcon className="h-6 w-6 text-accent" />
                                </div>
                                Platform Features
                            </h2>
                            <div className="space-y-4">
                                {[
                                    { title: 'Book Exchange', desc: 'Easily list your books and request ones you want to read from the community.' },
                                    { title: 'Credit System', desc: 'Earn 10 credits for sharing a book and spend 10 to request a new one.' },
                                    { title: 'Smart Discovery', desc: 'Get personalized book recommendations based on your reading history and interests.' },
                                    { title: 'Journey Tracking', desc: 'Log your finished books and store key takeaways to build your digital library.' }
                                ].map((feat) => (
                                    <div key={feat.title} className="bg-white p-5 rounded-2xl border border-gray-50 shadow-sm flex gap-4">
                                        <div className="w-1.5 h-auto bg-primary/20 rounded-full shrink-0"></div>
                                        <div>
                                            <h4 className="font-bold text-primary-dark mb-1">{feat.title}</h4>
                                            <p className="text-sm text-text-light leading-relaxed">{feat.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {/* Log Read Modal */}
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
                        <h2 className="text-2xl font-serif font-bold text-primary-dark mb-6">Log a Finished Book</h2>
                        <form onSubmit={handleLogRead} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text mb-1">Title</label>
                                <input
                                    required
                                    value={newRead.title}
                                    onChange={(e) => setNewRead({ ...newRead, title: e.target.value })}
                                    className="input"
                                    placeholder="Wings of Fire"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text mb-1">Author</label>
                                <input
                                    required
                                    value={newRead.author}
                                    onChange={(e) => setNewRead({ ...newRead, author: e.target.value })}
                                    className="input"
                                    placeholder="A.P.J. Abdul Kalam"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text mb-1">Genre</label>
                                <input
                                    value={newRead.genre}
                                    onChange={(e) => setNewRead({ ...newRead, genre: e.target.value })}
                                    className="input"
                                    placeholder="Autobiography"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text mb-1">Key Takeaways</label>
                                <textarea
                                    value={newRead.ideas}
                                    onChange={(e) => setNewRead({ ...newRead, ideas: e.target.value })}
                                    className="input min-h-[120px]"
                                    placeholder="What did you learn from this book?"
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 btn btn-outline">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : 'Save Read'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default MyReads;
