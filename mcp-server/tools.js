/**
 * MCP Tool Definitions for Video Intelligence Pipeline
 *
 * STATUS: Stub — implement after mcp-server/server.js is built.
 *
 * Each export here will become a tool that Claude Code can call.
 */

// Example structure for when you're ready to build this:
//
// const { analyzeVideo } = require("../src/analyze-video");
// const { generateFromAnalysis } = require("../src/generate-content");
//
// module.exports = {
//   analyze_video: {
//     description: "Analyze a video file for hooks, pacing, and viral potential",
//     parameters: { path: { type: "string", description: "Path to video file" } },
//     handler: async ({ path }) => analyzeVideo(path),
//   },
//   generate_script: {
//     description: "Generate a new script based on video analysis",
//     parameters: {
//       analysis: { type: "object", description: "Video analysis JSON" },
//       niche: { type: "string", description: "Content niche" },
//     },
//     handler: async ({ analysis, niche }) =>
//       generateFromAnalysis(analysis, { task: "script", niche }),
//   },
// };
