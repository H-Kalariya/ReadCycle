import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckIcon, XMarkIcon, ArrowPathIcon, ChatBubbleLeftEllipsisIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';

interface Request {
    _id: string;
    bookId: string;
    bookTitle: string;
    bookAuthor: string;
    requesterId: string;
    requesterName: string;
    requesterUserId: string;
    requesterPhone: string;
    requesterAddress: string;
    ownerId: string;
    ownerName: string;
    ownerUserId: string;
    ownerAddress: string;
    status: 'pending' | 'accepted' | 'rejected';
    message: string;
    requestedAt: string;
    exchangeAddress?: string;
    exchangeTime?: string;
}

const Requests = () => {
    const [incoming, setIncoming] = useState<Request[]>([]);
    const [outgoing, setOutgoing] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state for accepting request
    const [showAcceptModal, setShowAcceptModal] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [exchangeData, setExchangeData] = useState({
        message: '',
        date: '',
        time: '',
        address: ''
    });

    const fetchData = async () => {
        try {
            const res = await api.get('/requests');
            setIncoming(res.data.incoming);
            setOutgoing(res.data.outgoing);
        } catch (err) {
            toast.error('Failed to load requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async (requestId: string, action: 'accept' | 'reject') => {
        if (action === 'accept') {
            setSelectedRequestId(requestId);
            const req = incoming.find(r => r._id === requestId);
            setExchangeData(prev => ({ ...prev, address: req?.ownerAddress || '' }));
            setShowAcceptModal(true);
            return;
        }

        try {
            await api.post('/reject-request', { requestId });
            toast.success(`Request rejected`);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || `Failed to reject request`);
        }
    };

    const confirmAccept = async () => {
        try {
            const combinedDateTime = exchangeData.date && exchangeData.time
                ? new Date(`${exchangeData.date}T${exchangeData.time}`)
                : undefined;

            await api.post('/accept-request', {
                requestId: selectedRequestId,
                exchangeAddress: exchangeData.address,
                exchangeTime: combinedDateTime,
                exchangeMessage: exchangeData.message
            });

            toast.success(`Request accepted!`);
            setShowAcceptModal(false);
            setSelectedRequestId(null);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || `Failed to accept request`);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <ArrowPathIcon className="h-10 w-10 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="pt-24 pb-12 min-h-screen bg-secondary/20">
            <div className="container px-4 mx-auto">
                <h1 className="text-4xl font-serif font-bold text-primary-dark mb-10">Exchange Requests</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Incoming */}
                    <section>
                        <h2 className="text-2xl font-serif font-bold text-primary-dark mb-6 flex items-center gap-2">
                            <span className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-sm">
                                In
                            </span>
                            Incoming Requests
                        </h2>
                        <div className="space-y-4">
                            {incoming.length === 0 ? (
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <p className="text-text-light text-center py-4">No incoming requests yet.</p>
                                </div>
                            ) : (
                                incoming.map((req) => (
                                    <motion.div
                                        key={req._id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-serif font-bold text-primary-dark text-lg">{req.bookTitle}</h3>
                                                <p className="text-sm text-text-light">by {req.bookAuthor}</p>
                                            </div>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${req.status === 'pending' ? 'bg-accent/10 text-accent' :
                                                req.status === 'accepted' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                                                }`}>
                                                {req.status}
                                            </span>
                                        </div>

                                        <div className="space-y-2 mb-6">
                                            <div className="flex items-center gap-2 text-sm text-text">
                                                <CheckIcon className="h-4 w-4 text-primary" />
                                                <span>From: <strong>{req.requesterName}</strong></span>
                                            </div>
                                            {req.message && (
                                                <div className="flex items-start gap-2 text-sm text-text-light bg-secondary/50 p-3 rounded-lg">
                                                    <ChatBubbleLeftEllipsisIcon className="h-4 w-4 mt-0.5" />
                                                    <p className="italic">"{req.message}"</p>
                                                </div>
                                            )}
                                        </div>

                                        {req.status === 'pending' && (
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => handleAction(req._id, 'accept')}
                                                    className="flex-1 btn btn-primary py-2 text-sm flex items-center justify-center gap-2"
                                                >
                                                    <CheckIcon className="h-4 w-4" /> Accept
                                                </button>
                                                <button
                                                    onClick={() => handleAction(req._id, 'reject')}
                                                    className="flex-1 btn btn-outline py-2 text-sm flex items-center justify-center gap-2 border-danger text-danger hover:bg-danger hover:text-white"
                                                >
                                                    <XMarkIcon className="h-4 w-4" /> Reject
                                                </button>
                                            </div>
                                        )}

                                        {req.status === 'accepted' && (
                                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                                                <div className="flex items-center gap-2 text-sm text-text font-bold text-success mb-2">
                                                    <CheckIcon className="h-4 w-4" />
                                                    Accepted
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-text">
                                                    <MapPinIcon className="h-4 w-4 text-primary" />
                                                    <span>{req.exchangeAddress || 'Details pending...'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-text">
                                                    <ClockIcon className="h-4 w-4 text-primary" />
                                                    <span>{req.exchangeTime ? new Date(req.exchangeTime).toLocaleString() : 'Time pending...'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </section>

                    {/* Acceptance Modal */}
                    <AnimatePresence>
                        {showAcceptModal && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                                    onClick={() => setShowAcceptModal(false)}
                                />
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    className="bg-white rounded-3xl p-8 max-w-md w-full relative z-[101] shadow-2xl shadow-primary/20"
                                >
                                    <h2 className="text-2xl font-serif font-bold text-primary-dark mb-6">Exchange Details</h2>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-light mb-1 ml-1">Exchange Message</label>
                                            <textarea
                                                className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                placeholder="e.g., Let's meet at the library cafe."
                                                rows={3}
                                                value={exchangeData.message}
                                                onChange={(e) => setExchangeData({ ...exchangeData, message: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-text-light mb-1 ml-1">Date</label>
                                                <input
                                                    type="date"
                                                    className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                    value={exchangeData.date}
                                                    onChange={(e) => setExchangeData({ ...exchangeData, date: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-text-light mb-1 ml-1">Time</label>
                                                <input
                                                    type="time"
                                                    className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                    value={exchangeData.time}
                                                    onChange={(e) => setExchangeData({ ...exchangeData, time: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-light mb-1 ml-1">Meeting Address</label>
                                            <input
                                                type="text"
                                                className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                placeholder="Exchange location"
                                                value={exchangeData.address}
                                                onChange={(e) => setExchangeData({ ...exchangeData, address: e.target.value })}
                                            />
                                        </div>
                                        <div className="pt-4 flex gap-3">
                                            <button
                                                className="flex-1 btn btn-outline"
                                                onClick={() => setShowAcceptModal(false)}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                className="flex-1 btn btn-primary"
                                                onClick={confirmAccept}
                                            >
                                                Confirm Accept
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Outgoing */}
                    <section>
                        <h2 className="text-2xl font-serif font-bold text-primary-dark mb-6 flex items-center gap-2">
                            <span className="w-8 h-8 bg-accent/10 text-accent rounded-lg flex items-center justify-center text-sm">
                                Out
                            </span>
                            Sent Requests
                        </h2>
                        <div className="space-y-4">
                            {outgoing.length === 0 ? (
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <p className="text-text-light text-center py-4">You haven't sent any requests yet.</p>
                                </div>
                            ) : (
                                outgoing.map((req) => (
                                    <motion.div
                                        key={req._id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-serif font-bold text-primary-dark text-lg">{req.bookTitle}</h3>
                                                <p className="text-sm text-text-light">by {req.bookAuthor}</p>
                                            </div>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${req.status === 'pending' ? 'bg-accent/10 text-accent' :
                                                req.status === 'accepted' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                                                }`}>
                                                {req.status}
                                            </span>
                                        </div>

                                        <div className="space-y-2 mb-2">
                                            <div className="flex items-center gap-2 text-sm text-text">
                                                <CheckIcon className="h-4 w-4 text-accent" />
                                                <span>Owner: <strong>{req.ownerName}</strong></span>
                                            </div>
                                        </div>

                                        {req.status === 'accepted' && (
                                            <div className="mt-4 pt-4 border-t border-gray-100 bg-success/5 p-4 rounded-xl space-y-3">
                                                <p className="text-sm font-bold text-success mb-2">Great! The owner accepted your request.</p>
                                                <div className="flex items-center gap-2 text-sm text-text">
                                                    <MapPinIcon className="h-4 w-4 text-primary" />
                                                    <span>{req.exchangeAddress}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-text">
                                                    <ClockIcon className="h-4 w-4 text-primary" />
                                                    <span>{new Date(req.exchangeTime!).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        )}

                                        {req.status === 'rejected' && (
                                            <p className="text-xs text-danger mt-2 italic">This request was declined by the owner.</p>
                                        )}
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Requests;
