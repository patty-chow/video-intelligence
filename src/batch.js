require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { analyzeVideo } = require("./analyze-video");
const { generateFromAnalysis } = require("./generate-content");
const defaults = require("../config/defaults");

/**
 * Batch analyze multiple videos and generate a trend report.
 *
 * Usage:
 *   node src/batch.js [directory] [niche]
 *
 * Defaults to the videos/ directory if none specified.
 *
 * Examples:
 *   node src/batch.js
 *   node src/batch.js videos/ fitness
 *   node src/batch.js ~/Downloads/tiktoks/ tech
 */
async function batchRun() {
  const videoDir = process.argv[2] || "videos";
  const niche = process.argv[3] || defaults.niche;

  if (!fs.existsSync(videoDir)) {
    console.error(`Directory not found: ${videoDir}`);
    process.exit(1);
  }

  // Find all video files
  const videoExtensions = [".mp4", ".mov", ".avi", ".webm"];
  const videoFiles = fs
    .readdirSync(videoDir)
    .filter((f) => videoExtensions.includes(path.extname(f).toLowerCase()))
    .map((f) => path.join(videoDir, f));

  if (videoFiles.length === 0) {
    console.error(`No video files found in ${videoDir}`);
    console.log("Supported formats: mp4, mov, avi, webm");
    process.exit(1);
  }

  console.log(`\nFound ${videoFiles.length} videos in ${videoDir}`);
  console.log(`Niche: ${niche}\n`);

  // Analyze each video with Gemini
  const analyses = [];
  for (let i = 0; i < videoFiles.length; i++) {
    const videoPath = videoFiles[i];
    console.log(`[${i + 1}/${videoFiles.length}] Analyzing ${path.basename(videoPath)}...`);

    try {
      const analysis = await analyzeVideo(videoPath);
      analyses.push({
        filename: path.basename(videoPath),
        ...analysis,
      });

      // Save individual analysis
      const videoName = path.basename(videoPath, path.extname(videoPath));
      const analysisPath = path.join("output/analyses", `${videoName}_batch.json`);
      fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
    } catch (err) {
      console.error(`  Failed: ${err.message}`);
    }
  }

  if (analyses.length === 0) {
    console.error("\nNo videos were successfully analyzed.");
    process.exit(1);
  }

  console.log(`\nSuccessfully analyzed ${analyses.length}/${videoFiles.length} videos.`);

  // Generate trend report with Claude
  console.log(`\nGenerating trend report with Claude...\n`);
  const trendReport = await generateFromAnalysis(
    { videos: analyses, total_videos_analyzed: analyses.length },
    { task: "trends", niche }
  );

  // Save trend report
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
  const reportPath = path.join("output/trends", `trend-report_${timestamp}.md`);
  fs.writeFileSync(reportPath, trendReport);
  console.log(`Saved trend report → ${reportPath}`);

  // Save combined analyses
  const combinedPath = path.join("output/analyses", `batch-combined_${timestamp}.json`);
  fs.writeFileSync(combinedPath, JSON.stringify(analyses, null, 2));
  console.log(`Saved combined analyses → ${combinedPath}`);

  // Print report
  console.log(`\n${"=".repeat(60)}`);
  console.log(trendReport);
  console.log(`${"=".repeat(60)}\n`);
}

batchRun().catch((err) => {
  console.error("\nBatch error:", err.message);
  process.exit(1);
});
