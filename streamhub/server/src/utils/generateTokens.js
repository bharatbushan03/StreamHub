const jwt = require("jsonwebtoken");

const requireEnv = (value, name) => {
  if (!value) {
    throw new Error(`${name} is missing`);
  }
  return value;
};

const generateTokens = (userId) => {
  const accessSecret = requireEnv(process.env.ACCESS_TOKEN_SECRET, "ACCESS_TOKEN_SECRET");
  const refreshSecret = requireEnv(process.env.REFRESH_TOKEN_SECRET, "REFRESH_TOKEN_SECRET");
  const accessExpiry = process.env.ACCESS_TOKEN_EXPIRY || "1h";
  const refreshExpiry = process.env.REFRESH_TOKEN_EXPIRY || "7d";

  const accessToken = jwt.sign({ id: userId }, accessSecret, {
    expiresIn: accessExpiry
  });
  const refreshToken = jwt.sign({ id: userId }, refreshSecret, {
    expiresIn: refreshExpiry
  });

  return { accessToken, refreshToken };
};

module.exports = { generateTokens };
