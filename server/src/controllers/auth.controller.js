const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { generateTokens } = require("../utils/generateTokens");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildUserResponse = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  username: user.username,
  email: user.email,
  role: user.role
});

const registerUser = async (req, res, next) => {
  try {
    const fullName = req.body.fullName?.trim();
    const username = req.body.username?.trim().toLowerCase();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!fullName || !username || !email || !password) {
      res.status(400);
      throw new Error("All fields are required");
    }

    if (!emailPattern.test(email)) {
      res.status(400);
      throw new Error("Please provide a valid email address");
    }

    if (password.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters");
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      res.status(409);
      throw new Error(
        existingUser.email === email ? "Email already exists" : "Username already exists"
      );
    }

    const user = await User.create({
      fullName,
      username,
      email,
      password
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: buildUserResponse(user)
    });
  } catch (err) {
    next(err);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const username = req.body.username?.trim().toLowerCase();
    const password = req.body.password;

    if ((!email && !username) || !password) {
      res.status(400);
      throw new Error("Email or username and password are required");
    }

    const conditions = [];
    if (email) {
      conditions.push({ email });
    }
    if (username) {
      conditions.push({ username });
    }

    const user = await User.findOne({ $or: conditions }).select("+password +refreshToken");

    if (!user) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    if (user.isBanned) {
      res.status(403);
      throw new Error("Account is banned");
    }

    const isMatch = await user.isPasswordCorrect(password);
    if (!isMatch) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString());
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      user: buildUserResponse(user),
      accessToken,
      refreshToken
    });
  } catch (err) {
    next(err);
  }
};

const logoutUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+refreshToken");

    if (user) {
      user.refreshToken = "";
      await user.save({ validateBeforeSave: false });
    }

    res.status(200).json({
      success: true,
      message: "User logged out successfully"
    });
  } catch (err) {
    next(err);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: buildUserResponse(req.user)
    });
  } catch (err) {
    next(err);
  }
};

const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken;

    if (!refreshToken) {
      res.status(400);
      throw new Error("Refresh token is required");
    }

    if (!process.env.REFRESH_TOKEN_SECRET) {
      res.status(500);
      throw new Error("REFRESH_TOKEN_SECRET is missing");
    }

    if (!process.env.ACCESS_TOKEN_SECRET) {
      res.status(500);
      throw new Error("ACCESS_TOKEN_SECRET is missing");
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id).select("+refreshToken");

    if (!user) {
      res.status(401);
      throw new Error("User not found");
    }

    if (user.isBanned) {
      res.status(403);
      throw new Error("Account is banned");
    }

    if (!user.refreshToken || user.refreshToken !== refreshToken) {
      res.status(401);
      throw new Error("Refresh token is invalid");
    }

    const accessToken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1h"
    });

    res.status(200).json({
      success: true,
      accessToken
    });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      res.status(401);
    }
    next(err);
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  refreshAccessToken
};
