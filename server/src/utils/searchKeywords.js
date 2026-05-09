const splitKeywords = (value) => {
  if (value === undefined || value === null) {
    return [];
  }

  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
};

const normalizeKeyword = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const generateSearchKeywords = (video, owner = {}) => {
  const tags = Array.isArray(video.tags) ? video.tags : [];

  const keywords = [
    ...splitKeywords(video.title),
    ...splitKeywords(video.description),
    ...splitKeywords(video.category),
    ...tags.flatMap((tag) => splitKeywords(tag)),
    ...splitKeywords(owner.username),
    ...splitKeywords(owner.channelName),
    ...splitKeywords(owner.fullName)
  ];

  return [...new Set(keywords)].slice(0, 120);
};

module.exports = {
  generateSearchKeywords,
  normalizeKeyword,
  splitKeywords
};
