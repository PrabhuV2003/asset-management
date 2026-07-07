'use strict';

const { Op, where  } = require('sequelize');
const crypto = require('crypto');


// ----- GenerateUserId -----
// Produces a unique, sequential userId based on role and year.

const generateUserId = async(role, User) => {
    const year = new Date().getFullYear();

    const prefixMap = {
        employee_master: 'MGR',
        asset_master: 'AST',
        employee: 'EMP'
    }

    const prefix = prefixMap[role]  || 'EMP';

    // Fins the last-created user with this prefix/year pattern
    const  latest = await User.findOne({
        where: {
            userId: {
                [Op.like]: `${prefix}-${year}-%`
            }
        },
        order: [['createdAt', 'DESC']]
    })

    let sequence = 1
    if(latest) {
        // Extract the trailling number: "EMP-2026-007" -> 7
        const parts = latest.userId.split('-');
        const  lastSeq = arseInt(parts[parts.length - 1], 10);
        if(!isNaN(lastSeq)) {
            sequence = lastSeq + 1;
        }
    }

    return `${prefix}-${year}-${String(sequence).padStart(3, '0')}`;
};

// ----- GeneratePassword -----
// Produces a random 10-character password containing uppercase, lowercase, digits, and a symbol By Using randomness

const generatePassword = () => {
    const upper = 'ABCDEFGHIIJKLMNOPQRSTUVWXYZ'
    const lower = 'abcdefghijklmnopqrstuvwxyz'
    const digits = '123456789';
    const symbols = '@#$!';

    // Picking characers from each required set
    const pick = (charset, count) => {
        return Array.from({ length: count }, ()=>  {
            const idx = crypto.randomInt(0, charset.length);
            return charset[idx];
        })
    }

    const chars = [
        ...pick(upper, 2),
        ...pick(lower, 4),
        ...pick(digits, 2),
        ...pick(symbols, 2)
    ];

    for(let i = chars.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
}

module.exports = { generateUserId, generatePassword }