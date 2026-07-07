'use strict';

require('dotenv').config({ path: '../.env' });

const path = require('path');
// Enure dotenv reads from rpojects root
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { syncDatabase, User, Employee } = require('../models/index');

const seed = async() => {
    try {
        await syncDatabase();

        // Check if an admin already exists to prevent duplicate seeding
        const existing = await User.findOne({ where: { role: 'employee_master' } });
        if(existing) {
            console.log('An Employee Master Account Already Exists. Skipping Seed.')
            console.log(`User ID: ${existing.userId}`)
            process.exit(0);
        }

        // Create a placeholder Employee record for the admin
        const adminExployee = await Employee.create({
            fullName: 'System Administrator',
            email: 'admin@company.com',
            department: 'IT',
            branch: 'Head Office',
            designation: 'System Administrator',
            isActive: true
        })

        // Create the User account linked to the Employee record
        const adminUser = await User.create({
            userId: 'ADMIN-001',
            passwordHash: 'Admin@12345', // Will be hashed by the beforeSave hook
            role: 'employee_master',
            isActive: true,
            employeeId: adminExployee.id
        })

        console.log(`Send Complete! Save these credentials:\n User Id: ${adminUser.userId} \n Password: Admin@12345 \n Role: Employee Master`)

        process.exit(0);

    } catch (error) {
        console.error('Seed Failed:', error);
        process.exit(1);
    }
}

seed();