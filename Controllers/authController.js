import User from "../Models/User.js";
import bcrypt, { genSalt } from "bcrypt";
import jwt from "jsonwebtoken";

// Helper function to generate a JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.COOKIE_EXPIRES_IN || "7d", // Default to 7 days if not provided
  });
};

// Signup function
const signup = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      userType,
      city,
      state,
      country,
      expertise,
      experience,
      coordinates,
      expectedCompensation,
    } = req.body;

    // Ensure required fields are provided
    if (!name || !email || !password || !city || !state || !country) {
      return res.status(400).json({
        message: "Please fill in all the required fields",
        success: false,
      });
    }

    // Check if email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res
        .status(400)
        .json({ message: "Email is already registered", success: false });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Get file paths for profileImage and aadharCard
    const profileImage = req.files?.profileImage?.[0]?.path || null;
    const aadharCard = req.files?.aadharCard?.[0]?.path || null;

    // Create a new user object
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      userType,
      location: { city, state, country, coordinates },
      expertise,
      experience,
      aadharCard,
      profileImage,
      expectedCompensation,
    });

    // Save the user to the database
    await newUser.save();

    return res
      .status(201)
      .json({ message: "User registered successfully", success: true });
  } catch (err) {
    console.error("Signup error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Error occurred during signup",
    });
  }
};

// Login function
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!(email && password)) {
      return res.status(400).json({
        success: false,
        message: "Both email and password are required",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare the password with the hashed one
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate a JWT token
    const token = generateToken(user._id);

    // Set the token in an HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Ensure it works only in production if using HTTPS
      sameSite: "none", // Set to 'Strict' or 'Lax' if you're not using third-party cookies
      maxAge: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Cookie expiry
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      userType: user.userType,
      profileImage: user.profileImage,
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error occurred during login",
    });
  }
};

// Logout function
const logout = (req, res) => {
  res.clearCookie("token"); // Clear the cookie on logout
  return res.status(200).json({ message: "Logged out successfully" });
};

// User info function to fetch user data
const userInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    res.status(200).json({ user, success: true });
  } catch (error) {
    console.error("Error fetching user info:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Middleware to protect routes
const protect = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(404).json({ message: "User not found" });
    }

    next(); // Allow the request to continue
  } catch (err) {
    console.error("Authorization error:", err.message);
    return res.status(401).json({ message: "Not authorized, invalid token" });
  }
};

export { signup, login, logout, protect, userInfo };
