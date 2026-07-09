'use strict';

const sequelize = require('../config/database');
const User  = require('./user');
const Employee = require('./Employee');
const AssetCategory = require('./AssetCategory')
const Asset = require('./Asset')
const AssetIssue = require('./AssetIssue')

// ----- Associations -----
// One Employee has exactly one user account (login credentials)
Employee.hasOne(User, {
    foreignKey: 'employeeId',
    as: 'account'
});

User.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee'
});

// AssetCatrgpry <-> Asset
AssetCategory.hasMany(Asset, {
    foreignKey: 'categoryId',
    as: 'assets'
})

Asset.belongsTo(AssetCategory, {
    foreignKey: 'categoryId',
    as: 'category'
})

// Asset <-> Employee (current holder)
Asset.belongsTo(Employee, {
    foreignKey: 'assignedToId',
    as: 'assignedTo'
})

Employee.hasMany(Asset, {
    foreignKey: 'assignedToId',
    as: 'heldAssets'
})

// AssetIssue <-> Asset
Asset.hasMany(AssetIssue, {
    foreignKey: 'assetId',
    as: 'issues'
})

AssetIssue.belongsTo(Asset, {
    foreignKey: 'assetId',
    as: 'asset'
})

// AssetIssue <-> Employee (issued to) 
Employee.hasMany(AssetIssue, {
    foreignKey: 'employeeId',
    as: 'receivedIssues'
})

AssetIssue.belongsTo(Employee,  {
    foreignKey: 'employeeId',
    as: 'issuedTo'
})

// AssetIssue <-> Employee (issued by)
Employee.hasMany(AssetIssue, {
    foreignKey: 'issuedByEmployeeId',
    as: 'processedIssues'
})

AssetIssue.belongsTo(Employee, {
    foreignKey: 'issuedByEmployeeId',
    as: 'issuedBy'
})

// AssetIssue <-> Employee (returned by)
AssetIssue.belongsTo(Employee, {
    foreignKey: 'returnedByEmployeeId',
    as: 'returnedBy'
})



// ----- Sync -----
// alter: true updates the table schema if models change - safe for development.
// In production I use migrations instead.
const syncDatabase = async () =>{
    try {
        await sequelize.authenticate();
        console.log('Database connection established.');
        await sequelize.sync({ alter: true });
        console.log('All models synchronized.')
    } catch (error) {
        console.error('X Databse sync failed:', error);
        process.exit(1);
    }
}

module.exports ={
    sequelize,
    syncDatabase,
    User,
    Employee,
    AssetCategory,
    Asset,
    AssetIssue
}