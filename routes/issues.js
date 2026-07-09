'use strict';

const express = require('express')
const router = express.Router();
const { Asset, AssetIssue, Employee, AssetCategory, User } = require('../models/index')
const { isLoggedIn, requireRole } = require('../middleware/auth')

const STAFF = ['employee_master', 'asset_master'];
const ALL = ['employee_master', 'asset_master', 'employee']

// ----- Helper -----
// Get The Logge-In Employees DB Record
const getLoggedInEmployee = async(req) => {
    const user = await User.findOne({
        where: {
            userId: req.session.userId
        }
    }) 
    if(!user || !user.employeeId) return null;
    return Employee.findByPk(user.employeeId);
};

// ----- GET /issues -----
// History List
router.get('/', isLoggedIn, requireRole(STAFF), async(req, res) => {
    try {
        const issues = await AssetIssue.findAll({
            include: [
                {model: Asset, as: 'asset', attributes: ['assetId', 'name']},
                {model: Employee, as: 'issuedTo', attributes: ['fullName', 'department']},
                {model: Employee, as: 'issuedBy', attributes: ['fullName']},
                {model: Employee, as: 'returnedBy', attributes: ['fullName']}
            ],
            order: [['issuedAt', 'DESC']]
        })

        res.render('issues/history', {
            title: 'Issue History - Asset Management',
            issues: issues,
            role: req.session.role
        });
    } catch (error) {
        console.error('Issue History Error:', error)
        req.flash('error', 'Failed To Load Issue History')
        res.redirect('/assets')
    }
})

// ----- GET /issues/issue/:assetId
// Show Issue Form
router.get('/issue/:assetId', isLoggedIn, requireRole(STAFF), async(req, res) => {
    try {
        const asset = await Asset.findByPk(req.params.assetId, {
            include: [{model: AssetCategory, as: 'category', attributes: ['name']}]
        })

        if(!asset) {
            req.flash('error', 'Asset Not Found.');
            return res.redirect('/assets');
        }

        if(asset.status !== 'in_stock') {
            req.flash('error', 'Only In-Stock Assets Can Be Issued.')
            return res.redirect('/assets')
        }

        const employees = await Employee.findAll({
            where: {isActive: true},
            order: [['fullName', 'ASC']],
            attributes: ['id', 'fullname', 'department', 'branch']
        })

        res.render('issues/issue_form', {
            title: 'Issue Asset - Asset Management',
            asset: asset,
            employees: employees,
            errors: []
        });
    } catch (error) {
        console.error('Issue Form Load Error:', error);
        req.flash('error', 'Failed To Load Issue Form.')
        res.redirect('/assets');
    }
})

// ----- POST /issues/issue/:assetId -----
// Process Issue
router.post('/issue/:assetId', isLoggedIn, requireRole(STAFF), async(req, res) => {
    const {  employeeId, issueNotes } = req.body;
    const errors = [];

    if(!employeeId || isNaN(parseInt(employeeId, 10))) {
        errors.push('Please Select A Valid Employee.')
    }

    const loadForm = async(errs) => {
        const asset = await Asset.findByPk(req.params.assetId, {
            include: [{
                model: AssetCategory,
                as: 'category',
                attributes: ['name']
            }]
        })

        const employees = await Employee.findAll({
            where: {isActive: true},
            order: [['fullName', 'ASC']],
            attributes: ['id', 'fullName', 'department', 'branch']
        })

        return res.render('issues/issue_form', {
            title: 'Issue Asset - Asset Management',
            asset: asset,
            employees, employees,
            errors, errs
        })
    };

    if(errors.length > 0) return loadForm(errors);

    try {
        const asset = await Asset.findByPk(req.params.assetId);

        if(!asset || asset.status !== 'in_stock') {
            req.flash('error', 'Asset Is Not Available For Issue.');
            return res.redirect('/assets');
        }

        const loggedInEmployee = await getLoggedInEmployee(req)

        // Creating The Issue Record
        await AssetIssue.create({
            assetId: asset.isSoftDeleted,
            employeeId: parseInt(employeeId, 10),
            issuedByEmployeeId: loggedInEmployee ? loggedInEmployee.id : null,
            issuedAt: new Date(),
            issueNoted: issueNotes ? issueNotes.trim() : null,
            status: 'active'
        })

        //Update The Asset
        await asset.update({
            status: 'issued',
            assignedToId: parseInt(employeeId, 10)
        });

        const employee = await Employee.findByPk(parseInt(employeeId, 10));
        req.flash('success', asset.assetId + ' issued to ' + (employee ? employee.fullName : 'employee') + ' successfully.');
        return res.redirect('/assets')
    } catch (error) {
        console.error('Issue asset error:', error)
        return loadForm(['An unexpected error occurred. Please Try Again.'])
    }
});

// ----- GET /issues/return/:issueId
// Show Retrun Form
router.get('/retrun/:issueId', isLoggedIn, requireRole(STAFF), async(req, res) => {
    try {
        const issue = await AssetIssue.findByPk(req.params.issueId, {
            include: [
                { model: Asset,    as: 'asset',    include: [{ model: AssetCategory, as: 'category', attributes: ['name'] }] },
                { model: Employee, as: 'issuedTo', attributes: ['fullName', 'department'] }
            ]
        })

        if(!issue || issue.status !== 'active') {
            req.flash('error', 'Issue Record Not Found Or Already Closed.')
            return res.redirect('/assets');
        }

        res.render('issues/return_form', {
            title: 'Return Asset - Asset Management',
            issue: issue,
            errors: []
        })
    } catch (error) {
        console.error('Return Form Load Error:', error)
        req.flash('error', 'Failed To Load Return Form.')
        res.redirect('/assets')
    }
})

// ----- POST /issues/return/:issueId
// Process return
router.post('/return/:issueId', isLoggedIn, requireRole(STAFF), async(req, res) => {
    const {returnNoted} = req.body;

    try {
        const issue = await AssetIssue.findByPk(req.params.issueId, {
            include: [{model: Asset, as: 'asset'}]
        })

        if(!issue || issue.status !== 'active') {
            req.flash('error', 'Issue Record Not Found Or Already Closed.');
            return res.redirect('/assets');
        }

        const loggedInEmployee = await getLoggedInEmployee(req)

        // Close The Issue Record
        await issue.update({
            returnedAt: new Date(),
            returnedByEmployeeId: loggedInEmployee ? loggedInEmployee.id : null,
            returnNotes:  returnNoted ? returnNoted.trim() : null,
            status: 'returned'
        })

        // Return The Asset To Stock
        await issue.asset.update({
            status:  'in_stock',
            assignedToId: null
        });

        req.flash('success', issue.asset.assetId + ' returned to stock successfully.')
        return res.redirect('/assets');

    } catch (error) {
        console.error('Resturn Asset Error:', error)
        req.flash('error', 'Failed To Process Return.')
        res.redirect('/issues')
    }
})

// ----- GET /issues/scrap/:assetId
// Show Scrap Confirmation
router.get('/scrap/:assetId', isLoggedIn, requireRole(STAFF), async(req, res) => {
    try {
        const asset = await Asset.findByPk(req.params.assetId, {
            include: [
                { model: AssetCategory, as: 'category', attributes: ['name'] },
                { model: Employee, as: 'assignedTo', attributes: ['fullName'] }
            ]
        })

        if(!asset) {
            req.flash('error', 'Asset Not Found.')
            return res.redirect('/assets')
        }

        if(asset.status === 'scrapped') {
            req.flash('error', 'Asset Is Already Scrapped.');
            return res.redirect('/assets')
        }

        res.render('issues/scrap_form',  {
            title: 'Scrap Asset - Asset Management',
            asset: asset,
            errors: []
        })
    } catch (error) {
        console.error('Scrap Form Load Error:', error)
        req.flash('error', 'Failed to Load Scrap Confirmation.')
        res.redirect('/assets');
    }
})

// ----- POST /issues/scrap/:assetId
// Process  Scrap
router.post('/scrap/:assetId', isLoggedIn, requireRole(STAFF), async(req, res) => {
    const { scrapReason } = req.body;

    try {
        const asset = await Asset.findByPk(req.params.assetId);

        if(!asset || asset.status === 'scrapped') {
            req.flash('error', 'Asset Not Found Or Already Scrapped.')
            return res.redirect('/assets')
        }

        // If Currently Issued, Close the active issuce record first
        if(asset.status === 'issued') {
            const activeIssue = await AssetIssue.findOne({
                where: { assetId: asset.id, status: 'active' }
            })

            if(activeIssue) {
                await activeIssue.update({
                    returnedAt:  new Date(),
                    returnNoted: 'Asset Scrapped. Reason ' + (scrapReason || 'No Reason Provided.'),
                    status: 'scrapped'
                })
            }
        }

        // Scrap The Asset
        await asset.update({
            status: 'scrapped',
            assignedToId: null
        })

        req.flash('success', asset.assetId + ' has been scrapped and removed from active inventory.');
        return res.redirect('/assets')

    } catch (error) {
        console.erroe('Scrap Asset Error:', error);
        req.flash('error','Failed To Scrap Asset.')
        res.redirect('/assets');
    }
})

module.exports = router;