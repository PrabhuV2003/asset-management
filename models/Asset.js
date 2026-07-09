'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database')

class Asset extends Model {}

Asset.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        assetId: {
            type: DataTypes.STRING(30),
            allowNull: false,
            comment: 'Auto Generate Unique Identifier'
        },
        name: {
            type: DataTypes.STRING(120),
            allowNull: false
        },
        categoryId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'asset_categories',
                key: 'id'
            }
        },
        make: {
            type: DataTypes.STRING(80),
            allowNull: true,
            comment: 'Manudacturer Name'
        },
        model: {
            type: DataTypes.STRING(80),
            allowNull: true,
            comment: 'Product Model Name'
        },
        serialNumber: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Physical Serial Number From The Device'
        },
        purchaseDate: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        purchasePrice: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            defaultValue: 0.00
        },
        warrantyExpiry: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('in_stock', 'issued','scrapped'),
            allowNull: false,
            defaultValue: 'in_stock'
        },
        branch: {
            type: DataTypes.STRING(80),
            allowNull: true,
            comment: 'Branch Location Where Asset is Held'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        assignedToId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Employee Currently Holding This  Asset (Null if in_stock or scrapped)'
        }
    },
    {
        sequelize,
        modelName: 'Asset',
        tableName:  'assets',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['assetId'], name: 'assets_assetId_unique' }
        ]
    }
);

module.exports = Asset;