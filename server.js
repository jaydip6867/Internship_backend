const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Admin = require('./models/Admin');

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/inquiries', require('./routes/inquiryRoutes'));
app.use('/api/admissions', require('./routes/admissionRoutes'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    service: 'Internship Inquiry Management API',
  });
});

// Seed default admin if none exists
const seedAdmin = async () => {
  try {
    const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
    const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existingAdmin = await Admin.findOne({ username: defaultUsername });
    if (!existingAdmin) {
      const admin = new Admin({
        username: defaultUsername,
        name: 'Super Admin',
        email: 'admin@internship.com',
        password: defaultPassword,
        role: 'superadmin',
      });
      await admin.save();
      console.log(`✅ Default admin created successfully:`);
      console.log(`   Username: ${defaultUsername}`);
      console.log(`   Password: ${defaultPassword}`);
    } else {
      console.log(`ℹ️ Admin user '${defaultUsername}' is ready.`);
    }
  } catch (error) {
    console.error('Error seeding admin user:', error.message);
  }
};

const PORT = process.env.PORT || 5000;

// Connect to Database & Start Server
connectDB().then(() => {
  seedAdmin();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
});
