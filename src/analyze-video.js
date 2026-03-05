const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");
const defaults = require("../config/defaults");

// Load the Gemini prompt template
const PROMPT = fs.readFileSync(
  path.join(__dirname, "../prompts/video-analysis.txt"),
  "utf-8"
);

/**
 * Analyze a video file using Gemini's native video understanding.
 * Sends the full mp4 to Gemini and returns structured JSON analysis.
 *
 * @param {string} videoPath - Path to the mp4 file
 * @returns {object} Structured analysis of the video
 */
async function analyzeVideo(videoPath) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not found in environment. Copy .env.example to .env and add your key.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Read video file and convert to base64
  const videoData = fs.readFileSync(videoPath);
  const base64Video = videoData.toString("base64");

  // Detect mime type from extension
  const ext = path.extname(videoPath).toLowerCase();
  const mimeTypes = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".webm": "video/webm",
  };
  const mimeType = mimeTypes[ext] || "video/mp4";

  console.log(`  Sending ${path.basename(videoPath)} to Gemini (${(videoData.length / 1024 / 1024).toFixed(1)}MB)...`);

  const result = await ai.models.generateContent({
    model: defaults.models.gemini,
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inlineData: { mimeType, data: base64Video } },
        ],
      },
    ],
  });

  const responseText = result.text;

  // Parse JSON — strip markdown fences if Gemini adds them
  const cleaned = responseText.replace(/```json\n?|```\n?/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to parse Gemini response as JSON. Raw response:");
    console.error(responseText.substring(0, 500));
    throw new Error("Gemini did not return valid JSON. Try adjusting the prompt.");
  }
}

module.exports = { analyzeVideo };
