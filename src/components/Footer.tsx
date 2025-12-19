import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="col-span-1 md:col-span-1">
                        <Link to="/" className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-serif font-bold text-lg">
                                B
                            </div>
                            <span className="font-serif font-bold text-xl text-primary-dark tracking-tight">BookCycle</span>
                        </Link>
                        <p className="text-text-light text-sm leading-relaxed">
                            Sharing stories and building communities through the power of secondary-hand books. Join our sustainable book exchange today.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold text-primary-dark mb-6">Explore</h4>
                        <ul className="space-y-4 text-sm text-text-light">
                            <li><Link to="/browse" className="hover:text-primary transition-colors">Browse All Books</Link></li>
                            <li><Link to="/categories" className="hover:text-primary transition-colors">Categories</Link></li>
                            <li><Link to="/nearby" className="hover:text-primary transition-colors">Nearby Exchanges</Link></li>
                            <li><Link to="/new-arrivals" className="hover:text-primary transition-colors">New Arrivals</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-primary-dark mb-6">Community</h4>
                        <ul className="space-y-4 text-sm text-text-light">
                            <li><Link to="/how-it-works" className="hover:text-primary transition-colors">How it Works</Link></li>
                            <li><Link to="/guidelines" className="hover:text-primary transition-colors">Guidelines</Link></li>
                            <li><Link to="/events" className="hover:text-primary transition-colors">Book Swaps</Link></li>
                            <li><Link to="/blog" className="hover:text-primary transition-colors">Our Blog</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-primary-dark mb-6">Stay Connected</h4>
                        <p className="text-sm text-text-light mb-4">Join our newsletter for book events and updates.</p>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                placeholder="Email address"
                                className="input text-sm py-2 px-3 focus:ring-1"
                            />
                            <button className="btn btn-primary text-sm py-2">Join</button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-text-light">
                        © {new Date().getFullYear()} BookCycle. All rights reserved.
                    </p>
                    <div className="flex gap-6 text-xs text-text-light">
                        <Link to="/privacy" className="hover:text-primary">Privacy Policy</Link>
                        <Link to="/terms" className="hover:text-primary">Terms of Service</Link>
                        <Link to="/cookies" className="hover:text-primary">Cookies</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
