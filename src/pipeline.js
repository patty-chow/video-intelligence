require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { analyzeVideo } = require("./analyze-video");
const { generateFromAnalysis } = require("./generate-content");
const { saveAnalysis, buildHistoricalContext, getAnalysisCount } = require("./store");
const defaults = require("../config/defaults");

/**
 * Run the full pipeline: Gemini analyzes a video, Claude generates content.
 *
 * Usage:
 *   node src/pipeline.js <video_path> [task] [niche] [gut_read]
 *
 * Tasks: script, breakdown, trends
 *
 * Examples:
 *   node src/pipeline.js videos/hook-example.mp4
 *   node src/pipeline.js videos/hook-example.mp4 breakdown
 *   node src/pipeline.js videos/hook-example.mp4 script art
 *   node src/pipeline.js videos/hook-example.mp4 script art "feels too polished"
 */
async function run() {
  const videoPath = process.argv[2];
  const task = process.argv[3] || "script";
  const niche = process.argv[4] || defaults.niche;
  const gutRead = process.argv[5] || null;

  if (!videoPath) {
    console.log("Usage: node src/pipeline.js <video_path> [task] [niche] [gut_read]");
    console.log("");
    console.log("Tasks:");
    console.log("  script     — Generate a new script based on the video's winning formula");
    console.log("  breakdown  — Get a detailed analysis of why the video works (or doesn't)");
    console.log("  trends     — Analyze the broader trend this video belongs to");
    console.log("");
    console.log("Examples:");
    console.log("  node src/pipeline.js videos/viral-clip.mp4");
    console.log("  node src/pipeline.js videos/viral-clip.mp4 breakdown art");
    console.log('  node src/pipeline.js videos/viral-clip.mp4 script art "feels too safe"');
    process.exit(1);
  }

  if (!fs.existsSync(videoPath)) {
    console.error(`Video not found: ${videoPath}`);
    process.exit(1);
  }

  const videoName = path.basename(videoPath, path.extname(videoPath));
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);

  // Step 1: Analyze with Gemini
  console.log(`\n[1/3] Analyzing video with Gemini...`);
  const analysis = await analyzeVideo(videoPath);

  // Inject historical context from past runs
  const historicalContext = buildHistoricalContext();
  if (historicalContext) {
    analysis._historicalContext = historicalContext;
    console.log(`  Injected context from ${historicalContext.total_videos_analyzed} past video${historicalContext.total_videos_analyzed === 1 ? "" : "s"}`);
  }

  // Inject gut read
  if (gutRead) {
    analysis._gutRead = gutRead;
    analysis._gutReadNote =
      "Flag any meaningful disagreement between these scores and Brian's gut read above. Be direct — if the engine sees something differently than he does, say so.";
    console.log(`  Gut read logged: "${gutRead}"`);
  }

  // Step 2: Save analysis
  console.log(`\n[2/3] Saving analysis...`);
  const analysisPath = saveAnalysis(analysis, videoName);
  console.log(`  Saved analysis → ${analysisPath}`);

  // Step 3: Generate with Claude
  console.log(`\n[3/3] Generating ${task} with Claude...`);
  const result = await generateFromAnalysis(analysis, { task, niche });

  // Save output
  const outputDir =
    task === "script"
      ? "output/scripts"
      : task === "breakdown"
      ? "output/breakdowns"
      : "output/trends";
  const outputPath = path.join(outputDir, `${videoName}_${task}_${timestamp}.md`);
  fs.writeFileSync(outputPath, result);
  console.log(`  Saved ${task} → ${outputPath}`);

  // Print result
  console.log(`\n${"=".repeat(60)}`);
  console.log(result);
  console.log(`${"=".repeat(60)}\n`);

  // Memory stats
  const totalVideos = getAnalysisCount();
  console.log(`Videos in memory: ${totalVideos}`);
  if (totalVideos >= 5) {
    console.log(`Run \`node src/learn.js\` to extract patterns from your library.`);
  } else {
    const remaining = 5 - totalVideos;
    console.log(`${remaining} more video${remaining === 1 ? "" : "s"} until you can run \`node src/learn.js\`.`);
  }
}

process.on("unhandledRejection", (err) => {
  console.error("\nUnhandled error:", err.message || err);
  process.exit(1);
});

run().catch((err) => {
  console.error("\nPipeline error:", err.message);
  process.exit(1);
});
