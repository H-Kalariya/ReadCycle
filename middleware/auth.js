const ensureAuthenticated = (req, res, next) => {
    if (req.session.user) {
        // Map session user to req.user for compatibility
        req.user = {
            id: req.session.user.id,
            name: req.session.user.fullname,
            email: req.session.user.email
        };
        return next();
    }
    res.status(401).json({ msg: 'Authorization denied, please login' });
};

module.exports = { ensureAuthenticated };
