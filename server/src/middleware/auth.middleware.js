const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      res.status(401);
      throw new Error("Access token is missing");
    }

    if (!process.env.ACCESS_TOKEN_SECRET) {
      res.status(500);
      throw new Error("ACCESS_TOKEN_SECRET is missing");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded.id).select("-password -refreshToken");

    if (!user) {
      res.status(401);
      throw new Error("User not found");
    }

    if (user.isBanned) {
      res.status(403);
      throw new Error("Account is banned");
    }

    req.user = user;
    next();
  } catch (err) {
    if (res.statusCode === 200) {
      res.status(401);
    }
    next(err);
  }
};

module.exports = { verifyJWT };
