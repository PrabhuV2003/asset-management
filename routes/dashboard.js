'use strict';

const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth')

// ----- GET /dashboard -----
router.get('/', isLoggedIn, (req, res) => {
    const role = req.session.role;

    const roleDisplayName = {
        employee_master: 'Employee Master',
        asset_master: 'Asset Master',
        employee: 'Employee'
    }

    res.render('dashboard/index', {
        title: 'Dashboard - Asset Management',
        role: role,
        displayName: roleDisplayName[role] || 'User',
        userHandle: req.session.userHandle
    })
})

module.exports = router;