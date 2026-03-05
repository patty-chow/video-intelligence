module.exports = {
  // Set your content niche — this shapes how Claude thinks about your videos
  niche: "general",

  // Your preferred content style
  style: "engaging",

  // Model versions (update these as new versions release)
  models: {
    gemini: "gemini-2.0-flash",
    claude: "claude-sonnet-4-5-20250514"
  },

  // Frame extraction settings for Claude-only fallback mode
  frames: {
    perSecond: 1,
    hookSeconds: 5,
    hookFramesPerSecond: 2
  },

  // Max tokens for Claude responses
  maxTokens: 2000
};
