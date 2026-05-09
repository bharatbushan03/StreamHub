const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Full name must be at least 2 characters"],
      maxlength: [50, "Full name must be less than 50 characters"]
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username must be less than 30 characters"]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false
    },
    avatar: {
      type: String,
      default: ""
    },
    channelName: {
      type: String,
      trim: true,
      maxlength: [80, "Channel name must be less than 80 characters"]
    },
    channelDescription: {
      type: String,
      trim: true,
      maxlength: [1000, "Channel description must be less than 1000 characters"]
    },
    channelBanner: {
      type: String,
      default: ""
    },
    subscribersCount: {
      type: Number,
      default: 0
    },
    subscribedToCount: {
      type: Number,
      default: 0
    },
    totalVideos: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    },
    role: {
      type: String,
      enum: ["user", "creator", "admin"],
      default: "user"
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    isBanned: {
      type: Boolean,
      default: false
    },
    refreshToken: {
      type: String,
      select: false
    }
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return bcrypt.compare(password, this.password);
};

const removeSensitive = (doc, ret) => {
  delete ret.password;
  delete ret.refreshToken;
  delete ret.__v;
  return ret;
};

userSchema.set("toJSON", { transform: removeSensitive });
userSchema.set("toObject", { transform: removeSensitive });

module.exports = mongoose.model("User", userSchema);
