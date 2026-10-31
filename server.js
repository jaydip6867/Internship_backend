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

// Seed default admin ONLY if no admin exists at all
const seedAdmin = async () => {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const admin = new Admin({
        username: 'admin',
        name: 'Super Admin',
        email: 'admin@internship.com',
        password: 'Cdmi_Admin@9830',
        role: 'superadmin',
      });
      await admin.save();
      console.log('✅ Default admin created successfully with password Cdmi_Admin@9830');
    } else {
      console.log('ℹ️ Admin user already exists.');
    }
  } catch (error) {
    console.error('Error checking admin user:', error.message);
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
