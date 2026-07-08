'use strict';

const express = require('express');
const router = express.Router();
const { User, Employee } = require('../models/index')
const { isLoggedIn, requireRole } = require('../middleware/auth')
const { generateUserId, generatePassword } = require('../utils/generateUserId')

// Role that can manage employee - full access
const MANAGERS = ['employee_master']

// Roles that can view the employee list - Read Only
const VIEWERS = ['employee_master', 'asset_master'];

// ----- GET /employees  -----
router.get('/', isLoggedIn, requireRole(VIEWERS), async(req, res) => {
    try {
        const employees = await Employee.findAll({
            include: [
                {
                    model: User,
                    as: 'account',
                    attributes: ['userId', 'role', 'isActive', 'lastLoginAt']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.render('employees/index', {
            title: 'Employees - Asset Management',
            employees: employees,
            role: req.session.role
        });
    } catch (error) {
        console.error('Employee list error:', error);
        req.flash('error', 'Failed to load employee list.');
        res.redirect('/dashboard');
    }
})

// ----- GET /employee/new -----
router.get('/new', isLoggedIn, requireRole(MANAGERS), (req, res) => {
    res.render('employees/create', {
        title: 'Add Employee - Asset Management',
        FormData: {},
        error: []
    });
});

// ----- POST /employees -----
router.post('/', isLoggedIn, requireRole(MANAGERS), async(req, res) => {
    const { fullName, email, phone, department, branch, designation, joinDate, role } = req.body

    // ----- Server Side Validation -----
    const error = [];

    if(!fullName || fullName.trim().length < 2) {
    error.push('Full Name Must Be At Least 2 Characters.');
    }

    if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        error.push('A Valid Email Address Is Required.')
    }

    if(!role || !['employee_master', 'asset_master', 'employee'].includes(role)) {
        errors.push('A valid role must be selected.');
    }

    if(error.length > 0) {
        return res.render('employees/create', {
            title: 'Add Employee - Asset Management',
            formData: req.body,
            errors: errors
        })
    }

    try {
    // Checking for deplicate emil before creating anything
    const existingEmoloyee = await Employee.findOne({
        where: { email: email.trim().toLowerCase() }
    })
    if(existingEmoloyee) {
        return res.render('employees/create', {
            title: 'Add Employee - Asset Management',
            formData: req.body,
            errors: ['An Employee With This Email Address Already Exists.']
        })
    }

    // ----- Generate Credentials -----
    const newUserId = await generateUserId(role, User);
    const newPassword = generatePassword();

    // ----- Create Employee Recod First -----
    const employee = await Employee.create({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
        department: department ? department.trim() : null,
        branch: branch ? branch.trim() : null,
        designation: designation ? designation.trim() : null,
        joinDate: joinDate || null,
        isActive: true
    })

    // ----- Create Linked User Account -----
    // BedoreSave Hook in User.js - We Hash Password Automaticallyy.
    await User.create({
        userId: newUserId,
        passwordHash: newPassword,
        role: role,
        isActive: true,
        employeeId: employee.id
    })

    req.session.newCredentials = {
        userId: newUserId,
        password: newPassword,
        role: role,
        fullName: employee.fullName
    }

    return res.redirect('/employees/credentials')
    } catch (error) {
        console.error('Create employee error:', error);
        return res.render('emloyees/create', {
            title: 'Add  Employee - Asset Management',
            formData: req.body,
            error: ['An Unexpected Error Occurred. Please Try Again.']
        })
    }
});

// ----- GET /employees/credentials -----
// One Time Disaply Credentials
router.get('/credentials', isLoggedIn, requireRole(MANAGERS), (req, res) => {
    const credentials = req.session.newCredentials;

    if(!credentials) {
        // Someone is trying to access this page directly - redirect away
        req.flash('info', 'No credentials to display.');
        return res.redirect('/employees')
    }

    delete req.session.newCredentials;

    res.render('employees/credentials', {
        title: 'Account Created - Asset Management',
        credentials: credentials
    })
})

// ----- GET /employees/:id/edit -----
router.get('/:id/edit', isLoggedIn, requireRole(MANAGERS), async(req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id, {
            include: [{ model: User, as: 'account', attributes: ['userId', 'role', 'isActive'] }]
        })

        if(!employee) {
            req.flash('error', 'Employee not found.')
            return res.redirect('/employees')
        }

        res.render('emplpyees/edit', {
            title:  `Edit ${employee.fullName} - Asset Management`,
            employee: employee,
            errors: []
        })
    } catch (error) {
        console.error('Edit Employee Load Error:', error)
        req.flash('error', 'Failed to load employee.')
        res.redirect('/employees');
    }
})

// ----- POST /employees/:id/edit -----
router.post('/:id/edit', isLoggedIn, requireRole(MANAGERS), async(req, res) => {
    const { fullName, email, phone, department, branch, designation, joinDate } = req.body;

    const errors = [];

    if(!fullName || fullName.trim().length < 2) {
        errors.push('Full Name Must Be At Least 2 Characters.')
    }
    
    if(!email ||  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.push('A Valid Email Address Is Required.')
    }

    try {
        const employee = await Employee.findByPk(req.params.id, {
            include: [{ model: User, as: 'account', attributes: ['userId', 'role', 'isActive'] }]
        })

        if(!employee) {
            req.flash('error', 'Employee Not Found.');
            return res.redirect('/employees');
        }

        if(errors.length > 0) {
            return res.render('employees/edit', {
                title: `Edit ${employee.fullName} - Asset Management`,
                employee: { ...employee.toJSON(), ...req.body },
                errors: errors
            });
        }

        // Checking If the New Email Is Already Taken
        const duplicate = await Employee.findOne({
            where: {
                email: email.trim().toLowerCase(),
                id: {[require('sequelize').Op.ne]: employee.id}
            }
        })

        if(duplicate) {
            return res.render('employees/edit', {
                title: `Edit ${employee.fullName} - Asset Management`,
                employee: {...employee.toJSON(), ...req.body},
                errors: ['This Email Address Is Already Used By Another Employee.']
            })
        }

        await employee.update({
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone ? phone.trim() : null,
            department: department ? department.trim() : null,
            branch: branch ? branch.trim() : null,
            designation: designation ? designation.trim() : null,
            joinDate: joinDate ||null
        })

        req.flash('success', `${employee.fullName}'s Profile Has Been Updated`)
        return res.redirect('/employees')

    } catch (error) {
        console.error('Update Employee Error:', error);
        req.flash('error', 'Failed To Update Employee. Please Try Again.')
        return res.redirect(`/employees/${req.params.id}/edit`);
    }
})

// ----- POST /employee/:id/toggle -----
// Toggle the employee's active/inactive status
router.post('/:id/toggle', isLoggedIn, requireRole(MANAGERS), async(req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id, {
            include: [{ model: User, as: 'account' }]
        })

        if(!employee) {
            req.flash('error','Employee Not Found.')
            return res.redirect('/employees')
        }

        // Prevent Deactivating YourSelf
        if(employee.account && employee.account.id === req.session.userId) {
            req.flash('error','You Cannot Deactivate Your Own Account');
            return res.redirect('/employees');
        }

        const newStatus = !employee.isActive;

        // Update Records
        await employee.update({ isActive: newStatus })
        if(employee.account) {
            await employee.account.update({ isActive: newStatus });
        }

        const statusLabel = newStatus ? 'activated' : 'deactivated';
        req.flash('success', `${employee.fullName} Has Been ${statusLabel}.`);
        return res.redirect('/employees');
    } catch (error) {
        console.error('Toggle Employee Error:', error);
        req.flash('error', 'Failed To Update Employee Status.')
        res.redirect('/employees');
    }
});

module.exports = router;
