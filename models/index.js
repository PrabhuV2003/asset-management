'use strict';

const sequelize = require('../config/database');
const User  = require('./user');
const Employee = require('./Employee');
const AssetCategory = require('./AssetCategory')
const Asset = require('./Asset')

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
    Asset
}