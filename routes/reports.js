'use strict';

const express    = require('express');
const router     = express.Router();
const { Op }     = require('sequelize');
const { Asset, AssetCategory, AssetIssue, Employee } = require('../models/index');
const { isLoggedIn, requireRole } = require('../middleware/auth');

const STAFF = ['employee_master', 'asset_master'];

// ----- Helper -----
function buildCsv(headers, rows) {
    var escape = function(val) {
        return '"' + String(val === null || val === undefined ? '' : val).replace(/"/g, '""') + '"';
    };
    var lines = [headers.map(escape).join(',')];
    rows.forEach(function(row) {
        lines.push(row.map(escape).join(','));
    });
    return lines.join('\r\n');
}

// ----- GET /reports -----
router.get('/', isLoggedIn, requireRole(STAFF), async (req, res) => {
    try {
        // Summary counts for the landing cards
        const totalAssets    = await Asset.count();
        const issuedCount    = await Asset.count({ where: { status: 'issued'   } });
        const inStockCount   = await Asset.count({ where: { status: 'in_stock' } });
        const scrappedCount  = await Asset.count({ where: { status: 'scrapped' } });

        // Warranty expiring within 90 days
        var today      = new Date();
        var in90days   = new Date();
        in90days.setDate(in90days.getDate() + 90);
        const warrantyCount = await Asset.count({
            where: {
                warrantyExpiry: { [Op.between]: [today, in90days] },
                status:         { [Op.ne]: 'scrapped' }
            }
        });

        res.render('reports/index', {
            title:        'Reports — Asset Management',
            role:         req.session.role,
            totalAssets:  totalAssets,
            issuedCount:  issuedCount,
            inStockCount: inStockCount,
            scrappedCount:scrappedCount,
            warrantyCount:warrantyCount
        });
    } catch (error) {
        console.error('Reports landing error:', error);
        req.flash('error', 'Failed to load reports.');
        res.redirect('/dashboard');
    }
});

// ----- GET /reports/by-category -----
router.get('/by-category', isLoggedIn, requireRole(STAFF), async (req, res) => {
    try {
        const assets = await Asset.findAll({
            include: [{ model: AssetCategory, as: 'category', attributes: ['name'] }],
            order:   [['assetId', 'ASC']]
        });

        // Group in JavaScript
        var grouped = {};
        assets.forEach(function(asset) {
            var catName = asset.category ? asset.category.name : 'Uncategorised';
            if (!grouped[catName]) {
                grouped[catName] = { total: 0, inStock: 0, issued: 0, scrapped: 0, value: 0 };
            }
            grouped[catName].total++;
            if (asset.status === 'in_stock')  grouped[catName].inStock++;
            if (asset.status === 'issued')     grouped[catName].issued++;
            if (asset.status === 'scrapped')   grouped[catName].scrapped++;
            grouped[catName].value += parseFloat(asset.purchasePrice) || 0;
        });

        res.render('reports/by_category', {
            title:      'Report: By Category — Asset Management',
            role:       req.session.role,
            grouped:    grouped,
            categories: Object.keys(grouped).sort()
        });
    } catch (error) {
        console.error('By-category report error:', error);
        req.flash('error', 'Failed to load category report.');
        res.redirect('/reports');
    }
});

// ----- GET /reports/by-branch -----
router.get('/by-branch', isLoggedIn, requireRole(STAFF), async (req, res) => {
    try {
        const assets = await Asset.findAll({
            include: [{ model: AssetCategory, as: 'category', attributes: ['name'] }],
            order:   [['branch', 'ASC'], ['assetId', 'ASC']]
        });

        var grouped = {};
        assets.forEach(function(asset) {
            var branch = asset.branch || 'Unassigned';
            if (!grouped[branch]) {
                grouped[branch] = { total: 0, inStock: 0, issued: 0, scrapped: 0, value: 0 };
            }
            grouped[branch].total++;
            if (asset.status === 'in_stock')  grouped[branch].inStock++;
            if (asset.status === 'issued')     grouped[branch].issued++;
            if (asset.status === 'scrapped')   grouped[branch].scrapped++;
            grouped[branch].value += parseFloat(asset.purchasePrice) || 0;
        });

        res.render('reports/by_branch', {
            title:    'Report: By Branch — Asset Management',
            role:     req.session.role,
            grouped:  grouped,
            branches: Object.keys(grouped).sort()
        });
    } catch (error) {
        console.error('By-branch report error:', error);
        req.flash('error', 'Failed to load branch report.');
        res.redirect('/reports');
    }
});

// ----- GET /reports/issued -----
router.get('/issued', isLoggedIn, requireRole(STAFF), async (req, res) => {
    try {
        const activeIssues = await AssetIssue.findAll({
            where: { status: 'active' },
            include: [
                { model: Asset,    as: 'asset',
                  include: [{ model: AssetCategory, as: 'category', attributes: ['name'] }]
                },
                { model: Employee, as: 'issuedTo',  attributes: ['fullName', 'department', 'branch'] },
                { model: Employee, as: 'issuedBy',  attributes: ['fullName'] }
            ],
            order: [['issuedAt', 'ASC']]
        });

        res.render('reports/issued', {
            title:        'Report: Currently Issued — Asset Management',
            role:         req.session.role,
            activeIssues: activeIssues
        });
    } catch (error) {
        console.error('Issued report error:', error);
        req.flash('error', 'Failed to load issued assets report.');
        res.redirect('/reports');
    }
});

// ----- GET /reports/warranty  -----
router.get('/warranty', isLoggedIn, requireRole(STAFF), async (req, res) => {
    try {
        var today    = new Date();
        var in90days = new Date();
        in90days.setDate(in90days.getDate() + 90);

        const expiringAssets = await Asset.findAll({
            where: {
                warrantyExpiry: { [Op.between]: [today, in90days] },
                status:         { [Op.ne]: 'scrapped' }
            },
            include: [
                { model: AssetCategory, as: 'category',   attributes: ['name'] },
                { model: Employee,      as: 'assignedTo', attributes: ['fullName'] }
            ],
            order: [['warrantyExpiry', 'ASC']]
        });

        const expiredAssets = await Asset.findAll({
            where: {
                warrantyExpiry: { [Op.lt]: today },
                status:         { [Op.ne]: 'scrapped' }
            },
            include: [
                { model: AssetCategory, as: 'category',   attributes: ['name'] },
                { model: Employee,      as: 'assignedTo', attributes: ['fullName'] }
            ],
            order: [['warrantyExpiry', 'ASC']]
        });

        res.render('reports/warranty', {
            title:          'Report: Warranty Expiry — Asset Management',
            role:           req.session.role,
            expiringAssets: expiringAssets,
            expiredAssets:  expiredAssets
        });
    } catch (error) {
        console.error('Warranty report error:', error);
        req.flash('error', 'Failed to load warranty report.');
        res.redirect('/reports');
    }
});

// ----- GET /reports/export/assets.csv -----
router.get('/export/assets.csv', isLoggedIn, requireRole(STAFF), async (req, res) => {
    try {
        const assets = await Asset.findAll({
            include: [{ model: AssetCategory, as: 'category', attributes: ['name'] }],
            order:   [['assetId', 'ASC']]
        });

        var headers = [
            'Asset ID', 'Name', 'Category', 'Make', 'Model',
            'Serial No.', 'Status', 'Branch', 'Purchase Date',
            'Purchase Price (INR)', 'Warranty Expiry', 'Notes'
        ];

        var rows = assets.map(function(a) {
            return [
                a.assetId,
                a.name,
                a.category ? a.category.name : '',
                a.make          || '',
                a.model         || '',
                a.serialNumber  || '',
                a.status,
                a.branch        || '',
                a.purchaseDate  || '',
                a.purchasePrice || 0,
                a.warrantyExpiry|| '',
                a.notes         || ''
            ];
        });

        var csv = buildCsv(headers, rows);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="assets.csv"');
        res.send(csv);
    } catch (error) {
        console.error('Assets CSV export error:', error);
        req.flash('error', 'Failed to export assets.');
        res.redirect('/reports');
    }
});

// ----- GET /reports/export/issues.csv -----
router.get('/export/issues.csv', isLoggedIn, requireRole(STAFF), async (req, res) => {
    try {
        const issues = await AssetIssue.findAll({
            include: [
                { model: Asset,    as: 'asset',    attributes: ['assetId', 'name'] },
                { model: Employee, as: 'issuedTo', attributes: ['fullName', 'department'] },
                { model: Employee, as: 'issuedBy', attributes: ['fullName'] },
                { model: Employee, as: 'returnedBy', attributes: ['fullName'] }
            ],
            order: [['issuedAt', 'DESC']]
        });

        var headers = [
            'Asset ID', 'Asset Name', 'Issued To', 'Department',
            'Issued By', 'Issued On', 'Returned On', 'Returned By',
            'Status', 'Issue Notes', 'Return Notes'
        ];

        var rows = issues.map(function(iss) {
            return [
                iss.asset      ? iss.asset.assetId            : '',
                iss.asset      ? iss.asset.name               : '',
                iss.issuedTo   ? iss.issuedTo.fullName        : '',
                iss.issuedTo   ? iss.issuedTo.department || '': '',
                iss.issuedBy   ? iss.issuedBy.fullName        : '',
                iss.issuedAt   ? new Date(iss.issuedAt).toLocaleDateString('en-IN')  : '',
                iss.returnedAt ? new Date(iss.returnedAt).toLocaleDateString('en-IN'): '',
                iss.returnedBy ? iss.returnedBy.fullName      : '',
                iss.status,
                iss.issueNotes  || '',
                iss.returnNotes || ''
            ];
        });

        var csv = buildCsv(headers, rows);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="issue_history.csv"');
        res.send(csv);
    } catch (error) {
        console.error('Issues CSV export error:', error);
        req.flash('error', 'Failed to export issue history.');
        res.redirect('/reports');
    }
});

module.exports = router;