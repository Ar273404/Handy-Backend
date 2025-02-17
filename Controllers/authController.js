import User from "../Models/User.js";
import bcrypt, { genSalt } from "bcrypt";
import jwt from "jsonwebtoken";

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.COOKIE_EXPIRES_IN,
  });
};

// signup
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

    console.log(coordinates);
    console.log(Array.isArray(coordinates));

    if (!name || !email || !password || !city || !state || !country) {
      return res.status(400).json({
        message: "Fill all the required fields",
        success: false,
      });
    }

    // Checking if the email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res
        .status(400)
        .json({ message: "Email is already registered", success: false });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Get file URLs from Cloudinary
    const profileImage = req.files?.profileImage?.[0]?.path || null;
    const aadharCard = req.files?.aadharCard?.[0]?.path || null;

    // Create user
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

    await newUser.save();

    return res
      .status(201)
      .json({ message: "User registered successfully", success: true });
  } catch (err) {
    console.log("Server login error", err.message);
    return res.status(500).json({
      success: false,
      message: "Signup error from server side",
    });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!(email && password)) {
      return res.status(400).json({
        success: false,
        message: "All fileds are required...",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
      const token = jwt.sign(
      { userId: user._id, email: user.email }, // payload
      process.env.JWT_SECRET_KEY, // secret key
      {
        expiresIn: "7d", // optional (token expiry)
      }
    );

    // Set token in a secure cookie
    res.cookie("token", token, {
      httpOnly: true, // Can't be accessed by JavaScript
      secure: true, // Use HTTPS for secure cookie
      sameSite: "none", // CSRF protection
      maxAge: new Date(Date.now() + 7*24*60*60*1000), // Cookie expires after 7 days
    });

    return res.status(200).json({
      success: true,
      message: "Login successfully",
      userType : user.userType,
      profileImage: user.profileImage,
    });


  } catch (error) {
    console.log("Server login error", error.message);
    return res.status(500).json({
      success: false,
      message: "Server login error",
    });
  }
};

// Logout
const logout = (req, res) => {
  res.clearCookie("token"); // Clear the cookie on logout
  return res.status(200).json({ message: "Logged out successfully" });
};

// user-info
// to get the logged-in user's details
const userInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found", success: true });
    }

    console.log("uer " + user);

    // Return the user's profile information
    res.status(200).json({user , success : true});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Middleware to protect routes (verify JWT token)
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

    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: "Not authorized, invalid token" });
  }
};

export { signup, login, logout, protect ,userInfo};
