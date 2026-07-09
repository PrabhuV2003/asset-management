'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database')

class AssetIssue extends Model {}

AssetIssue.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        assetId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'FK to assets.id'
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Employee The asset Was Issued To'
        },
        issuedByEmployeeId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Staff Member Who Processed The Issue To Employee'
        },
        issuedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        returnedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        returnedByEmployeeId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Staff Member Who Processed The Return'
        },
        issueNotes:  {
            type: DataTypes.TEXT,
            allowNull: true
        },
        returnNotes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('active', 'returned', 'scrapped'),
            allowNull: false,
            defaultValue: 'active'
        }
    },
    {
        sequelize,
        modelName: 'AssetIssue',
        tableName: 'asset_issues',
        timestamps: true
    }
)

module.exports = AssetIssue;