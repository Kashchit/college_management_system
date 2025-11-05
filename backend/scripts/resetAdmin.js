const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

const resetAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = process.argv[2] || 'admin@college.edu';
    const password = process.argv[3] || 'admin123';

    // Find existing admin or create new one
    let admin = await Admin.findOne({ email });
    
    if (admin) {
      // Update existing admin's password
      admin.password = password; // Will be hashed by pre-save hook
      await admin.save();
      console.log(`Admin password reset successfully!`);
    } else {
      // Create new admin
      admin = new Admin({
        email,
        password // Will be hashed automatically
      });
      await admin.save();
      console.log(`Admin created successfully!`);
    }

    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('\n✅ You can now login with these credentials');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

resetAdmin();

