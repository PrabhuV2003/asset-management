'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path')
const session = require('express-session')
const flash = require('connect-flash')
const { syncDatabase } = require('./models/index')

const app = express();
const PORT = process.env.PORT || 3000;

// ----- View Engine -----
app.set('view engine', 'jade');
app.set('views', path.join(__dirname, 'views'));

// -----  Static Files -----
app.use(express.static(path.join(__dirname, 'public')));

// ----- Body Parsers -----
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ----- Session -----
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 8 * 60 * 60 * 1000
        }
    })
)

app.use(flash());

// ----- Global Temaple Locals -----
//  These variables are autmatically available in every Jade template.
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.info = req.flash('info');
    res.locals.session = req.session;
    next();
})

// ----- Routes -----
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard')

app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);

// ----- 404 Handler -----
app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist',
        statusCode: 404
    })
})

// ----- Global Error Hadnler -----
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack);
    res.status(500).render('error', {
        title: 'Server Error',
        message: 'Something went wrong. Please try again later.',
        statusCode: 500
    })
})

// ----- Start -----
syncDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    })
})