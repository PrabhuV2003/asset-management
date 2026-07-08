'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class AssetCategory extends Model {}

AssetCategory.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(80),
            allowNull: false,
            unique: true,
            validate: {notEmpty: true}
        },
        description: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    },
    {
        sequelize,
        modelName: 'AssetCategory',
        tableName: 'asset_categories',
        timestamps: true
    }
)

module.exports = AssetCategory;