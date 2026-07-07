'use strict';

const express = require('express');
const router = express.Router();
const { User } = require('../models/index');

// ----- GET /login -----
router.get('/login', (req, res) => {
    // If already logged in redirect to dashboard
    if(req.session && req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('auth/login', { title: 'Login - Assest Management' })
})

// ----- POST /login -----
router.post('/login', async(req, res) => {
    const { userId, password } = req.body;

    // Validation
    if(!userId || !password) {
        req.flash('error', 'User ID and password are required.');
        return res.redirect('/login');
    }

    try {
        const user = await User.findOne({ where: { userId: userId.trim() } })

        if(!user) {
            req.flash('error', 'Invalid credentials. Please try again.');
            return res.redirect('/login');
        }

        if(!user.isActive) {
            req.flash('error', 'Your account has been deactivated. Contact your administrator.');
            return res.redirect('/login');
        }

        const passwordaMatch = await user.validatePassword(password);
        if(!passwordaMatch) {
            req.flash('error', 'Invalid credentials. Please try again.');
            return res.redirect('/login');
        }

        // Regenerate session to prevent session fixation attacks
        req.session.regenerate(async(err) => {
            if(err) {
                console.error('Session regeneration error:', err);
                req.flash('error', 'Login failed. Please try again.');
                return res.redirect('/login');
            }

            // Store minimal data in session - not the full user object
            req.session.userId     = user.id;
            req.session.userHandle = user.userId;
            req.session.role       = user.role;

            // Record last login time
            await user.update({ lastLoginAt: new Date() });

            req.flash('success', `Welcome back, ${user.userId}!`);
            return res.redirect('/dashboard')
        })
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error', 'An error occurred. Please try again.');
        return res.redirect('/login');
    }
})

// ----- GET /logout -----
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if(err) {
            console.error('Session destruction error:', err);
        }
        res.clearCookie('connect.sid');
        return res.redirect('/login')
    })
})

// ----- GET /  -----
router.get('/', (req, res)  => {
    if(req.session && req.session.userId) {
        return res.redirect('/dashboard');
    }
    return res.redirect('/login');
})

module.exports = router;