'use strict';

const { Op } = require('sequelize');

// ----- GenerateAssetId -----
const generateAssetId = async(Asset) => {
    const year = new Date().getFullYear();
    const prefix = 'AST';

    const latest = await Asset.findOne({
        where: {
            assetId: { [Op.like]: prefix + '_' + year + '_%' }
        },
        order: [['createdAt', 'DESC']]
    });

    let sequence = 1;
    if(latest) {
        const parts = latest.assetId.split('_');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if(!isNaN(lastSeq)) {
            sequence = lastSeq + 1;
        }
    }

    return prefix + '_' + year + '_' + String(sequence).padStart(4, '0');
}

module.exports = {generateAssetId}