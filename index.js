require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB Connection Error:", err));

// User Schema
const UserSchema = new mongoose.Schema({
    name: String,
    birthday: String,
    address: String,
    contact: String,
    email: { type: String, unique: true },
    createdAt: { type: Date, default: Date.now }
});

// Auto-generate User ID
UserSchema.pre("save", function(next) {
    const year = this.createdAt.getFullYear().toString().slice(-2); // Get last 2 digits of the year
    const randomNumber = Math.floor(1000 + Math.random() * 9000); // Generate 4-digit number
    this.userId = `${year}-${randomNumber}`;
    next();
});

const User = mongoose.model("User", UserSchema);

// Admin Schema
const AdminSchema = new mongoose.Schema({
    username: String,
    email: { type: String, unique: true },
    password: String,
});
const Admin = mongoose.model("Admin", AdminSchema);

// Register Admin
app.post('/admin/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: "All fields are required!" });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = new Admin({ username, email, password: hashedPassword });
        await newAdmin.save();
        res.status(201).json({ message: "Admin registered successfully!" });
    } catch (err) {
        res.status(500).json({ message: "Error registering admin", error: err.message });
    }
});

// Admin Login
app.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "All fields are required!" });

    try {
        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(400).json({ message: "Invalid email or password!" });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid email or password!" });

        res.status(200).json({ message: "Login successful!", admin: { id: admin._id, email: admin.email } });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// Get Users List (with search functionality)
app.get('/users', async (req, res) => {
    const { search } = req.query;

    try {
        let query = {};
        if (search) {
            query = {
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { contact: { $regex: search, $options: "i" } }
                ]
            };
        }

        const users = await User.find(query).select("-password");
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ message: "Error fetching users", error: err.message });
    }
});

// Start Server
const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
