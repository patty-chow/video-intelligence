const fs = require("fs");
const path = require("path");

const ANALYSES_DIR = path.join(__dirname, "../output/analyses");
const INSIGHTS_DIR = path.join(__dirname, "../output/insights");
const TREND_LOG = path.join(INSIGHTS_DIR, "trend_log.md");

function ensureDirs() {
  [ANALYSES_DIR, INSIGHTS_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

/**
 * Save an analysis to output/analyses/ and append a summary to trend_log.md.
 * Returns the saved file path.
 */
function saveAnalysis(analysis, videoName) {
  ensureDirs();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
  const filename = `${videoName}_${timestamp}.json`;
  const filePath = path.join(ANALYSES_DIR, filename);

  fs.writeFileSync(filePath, JSON.stringify(analysis, null, 2));

  // Append summary to trend log
  const logEntry = buildLogEntry(analysis, videoName, timestamp);
  fs.appendFileSync(TREND_LOG, logEntry);

  return filePath;
}

function buildLogEntry(analysis, videoName, timestamp) {
  const vs = analysis.viral_signals || {};
  const cf = analysis.creator_fit || {};
  const hook = analysis.hook || {};

  const gutLine = analysis._gutRead ? `- **Brian's gut read**: ${analysis._gutRead}\n` : "";

  return `
## ${videoName} — ${timestamp.substring(0, 10)}
- **Hook type**: ${hook.type || "unknown"}
- **Pillar**: ${cf.pillar_alignment || "unknown"}
- **Shareability**: ${vs.shareability_score ?? "—"}/10
- **Novelty**: ${vs.novelty_score ?? "—"}/10
- **Personality presence**: ${cf.personality_presence_score ?? "—"}/10
- **Brand readiness**: ${cf.brand_deal_readiness_score ?? "—"}/10
- **Momentum**: ${cf.momentum_rating || "—"}
${gutLine}
`;
}

/**
 * Load all saved analysis JSONs from output/analyses/.
 */
function loadAllAnalyses() {
  ensureDirs();

  const files = fs
    .readdirSync(ANALYSES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  return files
    .map((f) => {
      try {
        const raw = fs.readFileSync(path.join(ANALYSES_DIR, f), "utf-8");
        return { filename: f, ...JSON.parse(raw) };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Build a historical context summary from all past analyses.
 * Injected into new runs so Claude can see patterns over time.
 */
function buildHistoricalContext() {
  const analyses = loadAllAnalyses();
  if (analyses.length === 0) return null;

  const scores = {
    shareability: [],
    novelty: [],
    personality_presence: [],
    brand_readiness: [],
  };

  const hookTypes = {};
  const pillars = {};
  const momentumRatings = {};

  for (const a of analyses) {
    const vs = a.viral_signals || {};
    const cf = a.creator_fit || {};
    const hook = a.hook || {};

    if (vs.shareability_score != null) scores.shareability.push(vs.shareability_score);
    if (vs.novelty_score != null) scores.novelty.push(vs.novelty_score);
    if (cf.personality_presence_score != null) scores.personality_presence.push(cf.personality_presence_score);
    if (cf.brand_deal_readiness_score != null) scores.brand_readiness.push(cf.brand_deal_readiness_score);

    if (hook.type) hookTypes[hook.type] = (hookTypes[hook.type] || 0) + 1;
    if (cf.pillar_alignment) pillars[cf.pillar_alignment] = (pillars[cf.pillar_alignment] || 0) + 1;
    if (cf.momentum_rating) momentumRatings[cf.momentum_rating] = (momentumRatings[cf.momentum_rating] || 0) + 1;
  }

  const avg = (arr) =>
    arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "n/a";

  const topKey = (obj) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1])[0]?.[0] || "none";

  return {
    total_videos_analyzed: analyses.length,
    avg_shareability: avg(scores.shareability),
    avg_novelty: avg(scores.novelty),
    avg_personality_presence: avg(scores.personality_presence),
    avg_brand_readiness: avg(scores.brand_readiness),
    most_common_hook_type: topKey(hookTypes),
    hook_type_distribution: hookTypes,
    pillar_distribution: pillars,
    momentum_distribution: momentumRatings,
    recent_videos: analyses.slice(-3).map((a) => ({
      filename: a.filename,
      hook_type: a.hook?.type,
      pillar: a.creator_fit?.pillar_alignment,
      shareability: a.viral_signals?.shareability_score,
      momentum: a.creator_fit?.momentum_rating,
    })),
  };
}

/**
 * Load the full trend log markdown.
 */
function loadTrendLog() {
  if (!fs.existsSync(TREND_LOG)) return null;
  return fs.readFileSync(TREND_LOG, "utf-8");
}

/**
 * Get count of stored analyses.
 */
function getAnalysisCount() {
  if (!fs.existsSync(ANALYSES_DIR)) return 0;
  return fs.readdirSync(ANALYSES_DIR).filter((f) => f.endsWith(".json")).length;
}

module.exports = {
  saveAnalysis,
  loadAllAnalyses,
  buildHistoricalContext,
  loadTrendLog,
  getAnalysisCount,
};
