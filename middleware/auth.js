'use strict';

/**
 * isLoggedIn
 * Middleware that blocks unauthenticated users.
 * Attach to any route that requires a login session.
 */
const isLoggedIn = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    req.flash('error', 'Please log in to access his page.');
    return res.redirect('/login');
}

const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if(!req.session || !req.session.userId) {
            req.flash('error', 'Please log in to access  this page.');
            return res.redirect('/login')
        }

        if(allowedRoles.includes(req.session.role)) {
            return next();
        }

        // Logges in but wrong role - send to their dashboard with an error
        req.flash('error', 'You do not have permission to access that page.')
        return res.redirect('/dashboard');
    }
}

module.exports = { isLoggedIn, requireRole };