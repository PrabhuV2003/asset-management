'use strict';

const express    = require('express');
const router     = express.Router();
const { Employee, Asset, AssetCategory, AssetIssue, User } = require('../models/index');
const { isLoggedIn } = require('../middleware/auth');

router.get('/', isLoggedIn, async (req, res) => {
    try {
        // ----- Employee stats -----
        const totalEmployees   = await Employee.count({ where: { isActive: true } });

        // ----- Asset stats -----
        const totalAssets      = await Asset.count();
        const inStockCount     = await Asset.count({ where: { status: 'in_stock'  } });
        const issuedCount      = await Asset.count({ where: { status: 'issued'    } });
        const scrappedCount    = await Asset.count({ where: { status: 'scrapped'  } });
        const totalCategories  = await AssetCategory.count({ where: { isActive: true } });

        // ----- Value stat -----
        const totalValueRaw    = await Asset.sum('purchasePrice', {
            where: { status: { [require('sequelize').Op.ne]: 'scrapped' } }
        });
        const totalValue       = totalValueRaw ? parseFloat(totalValueRaw) : 0;

        // ----- Recent activity -----
        const recentActivity   = await AssetIssue.findAll({
            include: [
                { model: Asset,    as: 'asset',    attributes: ['assetId', 'name'] },
                { model: Employee, as: 'issuedTo', attributes: ['fullName'] }
            ],
            order:  [['createdAt', 'DESC']],
            limit:  5
        });

        res.render('dashboard/index', {
            title:          'Dashboard — Asset Management',
            role:           req.session.role,
            userHandle:     req.session.userHandle,
            totalEmployees: totalEmployees,
            totalAssets:    totalAssets,
            inStockCount:   inStockCount,
            issuedCount:    issuedCount,
            scrappedCount:  scrappedCount,
            totalCategories:totalCategories,
            totalValue:     totalValue,
            recentActivity: recentActivity
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('dashboard/index', {
            title:          'Dashboard — Asset Management',
            role:           req.session.role,
            userHandle:     req.session.userHandle,
            totalEmployees: 0,
            totalAssets:    0,
            inStockCount:   0,
            issuedCount:    0,
            scrappedCount:  0,
            totalCategories:0,
            totalValue:     0,
            recentActivity: []
        });
    }
});

module.exports = router;