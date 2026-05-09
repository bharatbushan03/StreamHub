const mongoose = require("mongoose");
const Subscription = require("../models/subscription.model");
const User = require("../models/user.model");

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const validateObjectId = (id, label) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(`Invalid ${label}`, 400);
  }
};

const parsePagination = (query, defaultLimit = 20) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), 50);
  return { page, limit };
};

const buildChannelResponse = (channel) => ({
  _id: channel._id,
  fullName: channel.fullName,
  username: channel.username,
  avatar: channel.avatar,
  channelName: channel.channelName || channel.fullName,
  channelDescription: channel.channelDescription || "",
  channelBanner: channel.channelBanner || "",
  subscribersCount: channel.subscribersCount || 0,
  totalVideos: channel.totalVideos || 0,
  totalViews: channel.totalViews || 0
});

const buildSubscriberResponse = (subscriber) => ({
  _id: subscriber._id,
  fullName: subscriber.fullName,
  username: subscriber.username,
  avatar: subscriber.avatar,
  channelName: subscriber.channelName || subscriber.fullName
});

const syncSubscriptionCounts = async (subscriberId, channelId) => {
  const [subscribersCount, subscribedToCount] = await Promise.all([
    Subscription.countDocuments({ channel: channelId }),
    Subscription.countDocuments({ subscriber: subscriberId })
  ]);

  await Promise.all([
    User.updateOne({ _id: channelId }, { $set: { subscribersCount } }),
    User.updateOne({ _id: subscriberId }, { $set: { subscribedToCount } })
  ]);

  return { subscribersCount, subscribedToCount };
};

const subscribeToChannel = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    validateObjectId(channelId, "channel ID");

    if (channelId === req.user._id.toString()) {
      throw createError("You cannot subscribe to yourself", 400);
    }

    const channel = await User.findById(channelId);
    if (!channel) {
      throw createError("Channel not found", 404);
    }

    if (channel.isBanned) {
      throw createError("This channel is not available", 403);
    }

    try {
      await Subscription.create({
        subscriber: req.user._id,
        channel: channel._id
      });
    } catch (error) {
      if (error.code === 11000) {
        throw createError("Already subscribed to this channel", 409);
      }
      throw error;
    }

    const { subscribersCount } = await syncSubscriptionCounts(req.user._id, channel._id);

    res.status(200).json({
      success: true,
      message: "Subscribed successfully",
      isSubscribed: true,
      subscribersCount
    });
  } catch (err) {
    next(err);
  }
};

const unsubscribeFromChannel = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    validateObjectId(channelId, "channel ID");

    const channel = await User.findById(channelId);
    if (!channel) {
      throw createError("Channel not found", 404);
    }

    const subscription = await Subscription.findOneAndDelete({
      subscriber: req.user._id,
      channel: channel._id
    });

    if (!subscription) {
      throw createError("Subscription not found", 404);
    }

    const { subscribersCount } = await syncSubscriptionCounts(req.user._id, channel._id);

    res.status(200).json({
      success: true,
      message: "Unsubscribed successfully",
      isSubscribed: false,
      subscribersCount
    });
  } catch (err) {
    next(err);
  }
};

const getSubscriptionStatus = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    validateObjectId(channelId, "channel ID");

    if (channelId === req.user._id.toString()) {
      return res.status(200).json({
        success: true,
        isSubscribed: false
      });
    }

    const channel = await User.findById(channelId);
    if (!channel || channel.isBanned) {
      throw createError("Channel not found", 404);
    }

    const subscription = await Subscription.findOne({
      subscriber: req.user._id,
      channel: channel._id
    });

    res.status(200).json({
      success: true,
      isSubscribed: Boolean(subscription)
    });
  } catch (err) {
    next(err);
  }
};

const getMySubscriptions = async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const subscriberId = new mongoose.Types.ObjectId(req.user._id.toString());

    const basePipeline = [
      { $match: { subscriber: subscriberId } },
      {
        $lookup: {
          from: "users",
          localField: "channel",
          foreignField: "_id",
          as: "channel"
        }
      },
      { $unwind: "$channel" },
      { $match: { "channel.isBanned": { $ne: true } } }
    ];

    const countResult = await Subscription.aggregate([...basePipeline, { $count: "total" }]);
    const totalSubscriptions = countResult[0]?.total || 0;

    const subscriptions = await Subscription.aggregate([
      ...basePipeline,
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $project: {
          createdAt: 1,
          channel: {
            _id: "$channel._id",
            fullName: "$channel.fullName",
            username: "$channel.username",
            avatar: "$channel.avatar",
            channelName: "$channel.channelName",
            channelDescription: "$channel.channelDescription",
            channelBanner: "$channel.channelBanner",
            subscribersCount: "$channel.subscribersCount",
            totalVideos: "$channel.totalVideos",
            totalViews: "$channel.totalViews"
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      subscriptions: subscriptions.map((item) => ({
        _id: item._id,
        createdAt: item.createdAt,
        channel: buildChannelResponse(item.channel)
      })),
      pagination: {
        currentPage: page,
        totalPages: totalSubscriptions === 0 ? 1 : Math.ceil(totalSubscriptions / limit),
        totalSubscriptions
      }
    });
  } catch (err) {
    next(err);
  }
};

const getChannelSubscribers = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { page, limit } = parsePagination(req.query);
    validateObjectId(channelId, "channel ID");

    const channel = await User.findById(channelId);
    if (!channel || channel.isBanned) {
      throw createError("Channel not found", 404);
    }

    const isOwner = channel._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      throw createError("You cannot view this subscriber list", 403);
    }

    const basePipeline = [
      { $match: { channel: channel._id } },
      {
        $lookup: {
          from: "users",
          localField: "subscriber",
          foreignField: "_id",
          as: "subscriber"
        }
      },
      { $unwind: "$subscriber" },
      { $match: { "subscriber.isBanned": { $ne: true } } }
    ];

    const countResult = await Subscription.aggregate([...basePipeline, { $count: "total" }]);
    const totalSubscribers = countResult[0]?.total || 0;

    const subscribers = await Subscription.aggregate([
      ...basePipeline,
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $project: {
          createdAt: 1,
          subscriber: {
            _id: "$subscriber._id",
            fullName: "$subscriber.fullName",
            username: "$subscriber.username",
            avatar: "$subscriber.avatar",
            channelName: "$subscriber.channelName"
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      subscribers: subscribers.map((item) => ({
        _id: item._id,
        createdAt: item.createdAt,
        subscriber: buildSubscriberResponse(item.subscriber)
      })),
      pagination: {
        currentPage: page,
        totalPages: totalSubscribers === 0 ? 1 : Math.ceil(totalSubscribers / limit),
        totalSubscribers
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  subscribeToChannel,
  unsubscribeFromChannel,
  getSubscriptionStatus,
  getMySubscriptions,
  getChannelSubscribers
};
