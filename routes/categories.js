'use strict';

const express = require('express')
const router = express.Router();
const { AssetCategory } = require('../models/index')
const { isLoggedIn, requireRole } = require('../middleware/auth')

// Only Employee Master Can Manages Categories
const MANAGERS = ['employee_master'];

// View Only
const VIEWERS = ['employee_master', 'asset_master'];

// ----- GET /categories -----
router.get('/', isLoggedIn, requireRole(VIEWERS), async(req, res) => {
    try {
        const categories = await AssetCategory.findAll({
            order: [['name', 'ASC']]
        })

        res.render('categories/index', {
            title: 'Asset Categories - Asset Management',
            categories: categories,
            role: req.session.role
        })
    } catch (error) {
        console.error('Category List Error:', error);
        req.flash('error', 'Failed to Load Categories.')
        res.redirect('/dashboard');
    }
})

// ----- GET /categories/new -----
router.get('/new', isLoggedIn, requireRole(MANAGERS), (req, res) => {
    res.render('categories/create', {
        title: 'Add Category - Asset Management',
        formData: {},
        errors: []
    })
})

// ----- POST /categories -----
router.post('/', isLoggedIn, requireRole(MANAGERS), async(req, res) => {
    const {name, description} = req.body;
    const errors = [];

    if(!name || name.trim().length < 2) {
        errors.push('Category Name Must Be At Least 2 Characters');
    }

    if(errors.length > 0) {
        return res.render('categories/create', {
            title: 'Add Category - Asset Management',
            formData: req.body,
            errors: errors
        })
    }

    try {
        const existing = await AssetCategory.findOne({
            where: {name: name.trim()}
        })

        if(existing) {
            return res.render('categories/create', {
                title: 'Add Category - Asset Management',
                formData: req.body,
                errors: ['A Category With This Name Already Exists.']
            })
        }

        await AssetCategory.create({
            name: name.trim(),
            description: description ? description.trim() : null,
            isActive: true
        })

        req.flash('success', 'Category "' + name.trim() + '" created successfully.');
        return res.redirect('/categories');
    } catch (error) {
        console.error('Create Category Error:', error)
        return req.render('categories/create', {
            title: 'Add Category - Asset Management',
            formData: req.body,
            errors: ['An Unexpected Error Occurred. Please Try Again.']
        })
    }
})

// ----- GET /categories/:id/edit -----
router.get('/:id/edit', isLoggedIn, requireRole(MANAGERS), async(req, res) => {
    try {
        const category = await AssetCategory.findByPk(req.params.id);

        if(!category) {
            req.flash('error', 'Category Not Found.')
            return res.redirect('/categories');
        }

        res.render('categories/edit', {
            title: 'Edit Category - Asset Management',
            category: category,
            errors: []
        })
    } catch (error) {
        console.error('Edit Category Load Error:', error)
        req.flash('error', 'Failed To Load Category.');
        res.redirect('/categories');
    }
})

// ----- POST /categories/:id/edit -----
router.post('/:id/edit', isLoggedIn, requireRole(MANAGERS), async(req, res) => {
    const {name, description} = req.body;
    const errors = [];

    if(!name || name.trim().length < 2) {
        errors.push('Category Name Must Be At Least 2 Characters.');
    }

    try {
        const category = await AssetCategory.findByPk(req.params.id)

        if(!category) {
            req.flash('error', 'Category Not Found.')
            return res.redirect('/categories');
        }

        if(errors.length > 0) {
            return res.render('Categories/edit', {
                title: 'Edit Category - Asset Management',
                category: Object.assign({}, category.toJSON(), req.body),
                errors: errors
            })
        }
        const duplicate = await AssetCategory.findOne({
            where: {
                name: name.trim(),
                id: {[require('sequelize').Op.ne] : category.id}
            }
        })

        if(duplicate) {
            return res.render('Categories/edit', {
                title: 'Edit Category - Asset Management',
                category: Object.assign({}, category.toJSON(), req.body),
                errors: ['Another Category With This Name Already Exists.']
            })
        }

        await category.update({
            name: name.trim(),
            description: description ? description.trim() : null
        })

        req.flash('success', 'Category Updated Successfully.');
        return res.redirect('/categories');
    }   catch (error) {
        console.error('Update Category Error:', error);
        req.flash('error', 'Failed To Update Category');
        return res.redirect('/categories/' + req.params.id + '/edit');
    }
})

// ----- POST /categories/:id/toggle
router.post('/:id/toggle', isLoggedIn, requireRole(MANAGERS), async(req, res) => {
    try {
        const category = await AssetCategory.findByPk(req.params.id);

        if(!category) {
            req.flash('error', 'Category Not Found.');
            return res.redirect('/categories')
        }

        await category.update({ isActive: !category.isActive })
        const label = category.isActive ? 'deactivated' : 'activated';
        req.flash('success', '"' + category.name + '" Has Been' + label + '.');
        return res.redirect('/categories')
    } catch (error) {
        console.error('Toggle Category Error:', error);
        req.flash('error', 'Failed To Update Category Status.');
        res.redirect('/categories');
    }
})

module.exports = router;