const bcrypt = require('bcryptjs');
const db = require('./uploads/db.js');

async function seedAdmin() {
  await db.connectDB();
  
  const username = 'admin';
  const email = 'admin@ideal-eduprinthub.com';
  const plainPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(plainPassword, 12);
  
  // Check if admin exists
  const existingUser = await db.findUserByUsername(username);
  if (existingUser) {
    console.log('Admin user already exists. Skipping...');
    process.exit(0);
  }
  
  // Create admin
  const adminUser = {
    username,
    email,
    password: hashedPassword,
    role: 'admin'
  };
  
  await db.saveUser(adminUser);
  console.log(`Admin user created successfully! Login with: ${username} / ${plainPassword}`);
  process.exit(0);
}

seedAdmin().catch(console.error);

