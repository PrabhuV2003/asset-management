'use strict';

const express = require('express');
const router = express.Router();
const {Asset, AssetCategory, Employee, User, AssetIssue} = require('../models/index');
const { isLoggedIn, requireRole } = require('../middleware/auth')
const {generateAssetId} = require('../utils/generateAssetId');

const MANAGERS = ['employee_master']
const VIEWERS = ['employee_master', 'asset_master'];

// ----- GET /assets -----
router.get('/', isLoggedIn, requireRole(VIEWERS), async(req, res) => {
    try {
        const {status, categoryId} = req.query;

        // Filter
        const where = {};

        if(status && ['in_stock', 'issued', 'scrapped'].includes(status)) {
            where.status = status;
        }

        if(categoryId && !isNaN(parseInt(categoryId, 10))) {
            where.categoryId = parseInt(categoryId, 10);
        }

        const assets = await Asset.findAll({
            where: where,
            include: [
                {model: AssetCategory, as: 'category', attributes: ['name']}
            ],
            order: [['assetId', 'ASC']]
        })

        const categories = await AssetCategory.findAll({
            where: { isActive: true },
            order: [['name', 'ASC']]
        })

        // Attach activeIssueId to each issued asset so the Return button knows which record to close
        var issuedAssets = assets.filter(function(a) { return a.status === 'issued'; });
        if (issuedAssets.length > 0) {
            var issuedIds = issuedAssets.map(function(a) { return a.id; });
            var activeIssues = await AssetIssue.findAll({
                where: { assetId: issuedIds, status: 'active' }
            });
            var issueMap = {};
            activeIssues.forEach(function(iss) { issueMap[iss.assetId] = iss.id; });
            assets.forEach(function(a) { a.activeIssueId = issueMap[a.id] || null; });
        }

        res.render('assets/index', {
            title: 'Assets - Asset Management',
            assets: assets,
            categories: categories,
            filters: {status: status || '', categoryId: categoryId || ''},
            role: req.session.role
        })
    } catch (error) {
        console.error('Asset List Error:', error);
        req.flash('error', 'Failed To Load Assets.');
        res.redirect('/dashboard');
    }
})

// ----- GET /assets/new -----
router.get('/new', isLoggedIn, requireRole(VIEWERS), async(req, res) => {
    try {
        const categories = await AssetCategory.findAll({
            where: {isActive: true},
            order: [['name', 'ASC']]
        })

        res.render('assets/create', {
            title: 'Add Asset - Asset Management',
            formData: {},
            categories: categories,
            errors: []
        })
    } catch (error) {
        console.error('Load create asset form error:', error);
        req.flash('error', 'Failed To Load Form.');
        res.redirect('/assets');
    }
})

// ----- GET /assets/stock -----
router.get('/stock', isLoggedIn, requireRole(VIEWERS), async(req, res) => {
    try {
        const stockAssets = await Asset.findAll({
            where: {status: 'in_stock'},
            include: [
                {model: AssetCategory, as: 'category', attributes: ['name']}
            ],
            order: [['branch', 'ASC'], ['assetId', 'ASC']]
        });

        var grouped = {};
        var grandTotal = 0;
        var totalCount =  stockAssets.length;

        stockAssets.forEach(function(asset) {
            var branch = asset.branch || 'Unassigned'
            if(!grouped[branch]) {
                grouped[branch] = {assets: [], count: 0,value: 0}
            }
            grouped[branch].assets.push(asset);
            grouped[branch].count++;
            var price = parseFloat(asset.purchasePrice) || 0;
            grouped[branch].value += price;
            grandTotal += price
        })

        res.render('assets/stock', {
            title: 'Stock View - Asset Management',
            grouped: grouped,
            branches: Object.keys(grouped),
            grandTotal: grandTotal,
            totalCount:totalCount,
            role: req.session.role
        })
    } catch (error) {
        console.error('Stock View Error:', error);
        req.flash('error', 'Failed To Load Stock View.')
        res.redirect('/assets')
    }
})

// ----- GET /assets/my
router.get('/my', isLoggedIn, async(req, res) => {
    try {
        const user = await User.findByPk(req.session.userId);

        if(!user || !user.employeeId) {
            req.flash('error', 'No Employee Profile Linked To Your Account.');
            return res.redirect('/dashboard');
        }

        const myAssets = await Asset.findAll({
            where: {
                assignedToId: user.employeeId,
                status: 'issued'
            },
            include:  [
                { model: AssetCategory, as: 'category', attributes: ['name'] },
                { model: Employee,      as: 'assignedTo', attributes: ['fullName'] }
            ],
            order: [['assetId', 'ASC']]
        })

        // Geting the active issue records for these assets (to get issue date)
        const assetIds =  myAssets.map(function(a) {
            return a.id;
        })

        var issueMap = {};

        if(assetIds.length > 0) {
            const { AssetIssue } = require('../models/index')
            const activeIssues = await AssetIssue.findAll({
                where:  {
                    assetId: assetIds,
                    status: 'active'
                }
            })
            activeIssues.forEach(function(issue) {
                issueMap[issue.assetId] = issue;
            })
        }

        res.render('assets/my_assets', {
            title: 'My Assets - Asset Management',
            myAssets: myAssets,
            issueMap: issueMap,
            role: req.session.role
        })
    } catch (error) {
        console.error('My Assets Error:', error);
        req.flash('error', 'Failed To Load Your Assets.')
        res.redirect('/dashboard')
    }
})

// ----- POST /assets -----
router.post('/', isLoggedIn, requireRole(VIEWERS), async(req, res) => {
    const { name, categoryId, make, model, serialNumber, purchaseDate, purchasePrice, warrantyExpiry, branch, notes } = req.body

    const errors = []

    if(!name || name.trim().length < 2) {
        errors.push('Asset Name Must Be At Least 2 Characters.')
    }

    if(!categoryId || isNaN(parseInt(categoryId, 10))) {
        errors.push('A Valid Category Must Be Selected.')
    }

    const loadForm = async(errs) => {
        const categories = await AssetCategory.findAll({
            where:{isActive: true},
            order: [['name', 'ASC']]
        });
        return res.render('assets/create', {
            title: 'Add Asset - Asset Management',
            formData: req.body,
            categories: categories,
            errors: errs
        })
    }
    if(errors.length > 0) {
        return loadForm(errors);
    }

    try {
        if(serialNumber && serialNumber.trim()) {
            const dupSerial = await Asset.findOne({
                where: { serialNumber: serialNumber.trim() }
            })
            if(dupSerial) {
                return loadForm(['An Asset With This Serial Number Already Exists.'])
            }
        }

        const newAssetId = await generateAssetId(Asset);

        await Asset.create({
            assetId: newAssetId,
            name: name.trim(),
            categoryId: parseInt(categoryId, 10),
            make: make ? make.trim() : null,
            model: model ? model.trim() : null,
            serialNumber: serialNumber ? serialNumber.trim() : null,
            purchaseDate: purchaseDate || null,
            purchasePrice: purchasePrice? parseFloat(purchasePrice) : 0,
            warrantyExpiry: warrantyExpiry || null,
            status: 'in_stock',
            branch: branch ? branch.trim() : null,
            notes: notes ? notes.trim() : null
        })

        req.flash('success', 'Asset' + newAssetId + ' Created Successfully.');
        return res.redirect('/assets')
    } catch (error) {
        console.error('Create Asset Error:', error)
        return loadForm(['An Unexpected Error Occurred. Please Try Again.'])
    }
});

// ----- GET /assets/:id/edit -----
router.get('/:id/edit', isLoggedIn, requireRole(VIEWERS), async(req, res) => {
    try {
        const asset = await Asset.findByPk(req.params.id, {
            include: [{ model: AssetCategory, as: 'category', attributes: ['name'] }]
        })

        if(!asset) {
            req.flash('error', 'Asset Not Found.')
            return res.redirect('/assets')
        }

        const categories = await AssetCategory.findAll({
            where: {isActive: true},
            order: [['name', 'ASC']]
        })

        res.render('assets/edit', {
            title: 'Edit Asset - Asset Management',
            asset: asset,
            categories:  categories,
            errors: []
        })
    } catch (error) {
        console.error('Edit Asset Load Error:', error);
        req.flash('error', 'Failed To Load Asset.')
        res.redirect('/assets')
    }
})

// ----- POST /assets/:id/edit -----
router.post('/:id/edit', isLoggedIn, requireRole(VIEWERS), async(req, res) => {
    const { name, categoryId, make, model, serialNumber, purchaseDate, purchasePrice, warrantyExpiry, branch, notes } = req.body

    const errors = [];

    if(!name || name.trim().length < 2) {
        errors.push('Asset Name Must Be At Least 2 Characters.')
    }

    if(!categoryId || isNaN(parseInt(categoryId, 10))) {
        errors.push('A Valid Category Must Be Selected.')
    }

    try {
        const asset = await Asset.findByPk(req.params.id, {
            include: [{model: AssetCategory, as: 'category'}]
        })

        if(!asset) {
            req.flash('error', 'Asset Not Found.')
            return res.redirect('/assets');
        }

        const categories = await AssetCategory.findAll({
            where:  {isActive: true},
            order: [['name', 'ASC']]
        })

        if(errors.length > 0)  {
            return res.render('assets/edit', {
                title: 'Edit Asset - Asset Management',
                asset: Object.assign({}, asset.toJSON(), req.body),
                categories: categories,
                errors: errors
            })
        }

        // Checking Duplicate Serial Number - Excluding This Asset
        if(serialNumber && serialNumber.trim()) {
            const dupSerial = await Asset.findOne({
                where: {
                    serialNumber: serialNumber.trim(),
                    id: { [require('sequelize').Op.ne]: asset.id }
                }
            })
            if(dupSerial) {
                return res.render('assets/edit', {
                    title: 'Edit Asset - Asset Management',
                    asset: Object.assign({}, asset.toJSON(), req.body),
                    categories: categories,
                    errors: ['Another asset with this erial number already exists.']
                })
            }
        }

        await asset.update({
            name: name.trim(),
            categoryId: parseInt(categoryId, 10),
            make: make ? make.trim() : null,
            model: model ? model.trim() : null,
            serialNumber: serialNumber ? serialNumber.trim() : null,
            purchaseDate: purchaseDate || null,
            purchasePrice: purchasePrice ? parseFloat(purchasePrice) : 0,
            warrantyExpiry: warrantyExpiry || null,
            branch: branch ? branch.trim() : null,
            notes: notes ? notes.trim() : null
        })

        req.flash('success', asset.assetId + ' Updated Successully.')
    } catch (error) {
        console.error('Update Asset Error:', error);
        req.flash('error', 'Failed To Update Asset.');
        return res.redirect('/assets/' + req.params.id + '/edit');
    }
})

module.exports = router;