require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { analyzeVideo } = require("./analyze-video");
const { generateFromAnalysis } = require("./generate-content");
const defaults = require("../config/defaults");

/**
 * Run the full pipeline: Gemini analyzes a video, Claude generates content.
 *
 * Usage:
 *   node src/pipeline.js <video_path> [task] [niche]
 *
 * Tasks: script, breakdown, trends
 *
 * Examples:
 *   node src/pipeline.js videos/hook-example.mp4
 *   node src/pipeline.js videos/hook-example.mp4 breakdown
 *   node src/pipeline.js videos/hook-example.mp4 script fitness
 */
async function run() {
  const videoPath = process.argv[2];
  const task = process.argv[3] || "script";
  const niche = process.argv[4] || defaults.niche;

  if (!videoPath) {
    console.log("Usage: node src/pipeline.js <video_path> [task] [niche]");
    console.log("");
    console.log("Tasks:");
    console.log("  script     — Generate a new script based on the video's winning formula");
    console.log("  breakdown  — Get a detailed analysis of why the video works (or doesn't)");
    console.log("  trends     — Analyze the broader trend this video belongs to");
    console.log("");
    console.log("Examples:");
    console.log("  node src/pipeline.js videos/viral-clip.mp4");
    console.log("  node src/pipeline.js videos/viral-clip.mp4 breakdown fitness");
    process.exit(1);
  }

  if (!fs.existsSync(videoPath)) {
    console.error(`Video not found: ${videoPath}`);
    process.exit(1);
  }

  const videoName = path.basename(videoPath, path.extname(videoPath));
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);

  // Step 1: Analyze with Gemini
  console.log(`\n[1/2] Analyzing video with Gemini...`);
  const analysis = await analyzeVideo(videoPath);

  // Save the raw analysis
  const analysisPath = path.join("output/analyses", `${videoName}_${timestamp}.json`);
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
  console.log(`  Saved analysis → ${analysisPath}`);

  // Step 2: Generate with Claude
  console.log(`\n[2/2] Generating ${task} with Claude...`);
  const result = await generateFromAnalysis(analysis, { task, niche });

  // Save the output
  const outputDir = task === "script" ? "output/scripts" : task === "breakdown" ? "output/breakdowns" : "output/trends";
  const outputPath = path.join(outputDir, `${videoName}_${task}_${timestamp}.md`);
  fs.writeFileSync(outputPath, result);
  console.log(`  Saved ${task} → ${outputPath}`);

  // Print result
  console.log(`\n${"=".repeat(60)}`);
  console.log(result);
  console.log(`${"=".repeat(60)}\n`);
}

run().catch((err) => {
  console.error("\nPipeline error:", err.message);
  process.exit(1);
});
