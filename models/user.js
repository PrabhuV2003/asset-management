'use strict';

const { DataTypes, Model } = require('sequelize')
const bcrypt = require('bcryptjs')
const sequelize = require('../config/database')

class User extends Model {
    // Instance method: comapre a plain text password to the stored hash
    async validatePassword(plainText) {
        return bcrypt.compare(plainText, this.passwordHash);
    }
}

User.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId:  {
            type: DataTypes.STRING(30),
            allowNull: false,
            unique: true,
            comment: 'Auto Generated Login Handle'
        },
        passwordHash: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        role: {
            type: DataTypes.ENUM('employee_master', 'asset_master', 'employee'),
            allowNull: false,
            defaultValue: 'employee'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        LastLoginAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: true // null for the very first seeded admi
        }
    },
    {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        timestamps: true // adds createdAt, updatedAt automatically
    }
);

// ----- Hooks -----
// Before any save, hash the password if it has been changed.
User.addHook('beforeSave', async(user) => {
    if(user.changed('passwordHash')) {
        const salt = await bcrypt.genSalt(12);
        user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
    }
})

module.exports = User;