require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");
const { loadAllAnalyses, getAnalysisCount } = require("./store");
const defaults = require("../config/defaults");

const INSIGHTS_DIR = path.join(__dirname, "../output/insights");
const MIN_VIDEOS = 3;

/**
 * Aggregate stats across all stored analyses.
 */
function aggregateStats(analyses) {
  const scores = {
    shareability: [],
    novelty: [],
    personality: [],
    brand: [],
    relatability: [],
    save_worthy: [],
    comment_bait: [],
  };

  const hookTypes = {};
  const pillars = {};
  const momentumRatings = {};
  const tones = {};
  const editingStyles = {};
  const primaryEmotions = {};

  for (const a of analyses) {
    const vs = a.viral_signals || {};
    const cf = a.creator_fit || {};
    const script = a.script || {};
    const prod = a.production || {};
    const psych = a.psychology || {};
    const hook = a.hook || {};

    if (vs.shareability_score != null) scores.shareability.push(vs.shareability_score);
    if (vs.novelty_score != null) scores.novelty.push(vs.novelty_score);
    if (cf.personality_presence_score != null) scores.personality.push(cf.personality_presence_score);
    if (cf.brand_deal_readiness_score != null) scores.brand.push(cf.brand_deal_readiness_score);
    if (vs.relatability_score != null) scores.relatability.push(vs.relatability_score);
    if (vs.save_worthy_score != null) scores.save_worthy.push(vs.save_worthy_score);
    if (vs.comment_bait_score != null) scores.comment_bait.push(vs.comment_bait_score);

    if (hook.type) hookTypes[hook.type] = (hookTypes[hook.type] || 0) + 1;
    if (cf.pillar_alignment) pillars[cf.pillar_alignment] = (pillars[cf.pillar_alignment] || 0) + 1;
    if (cf.momentum_rating) momentumRatings[cf.momentum_rating] = (momentumRatings[cf.momentum_rating] || 0) + 1;
    if (script.tone) tones[script.tone] = (tones[script.tone] || 0) + 1;
    if (prod.editing_style) editingStyles[prod.editing_style] = (editingStyles[prod.editing_style] || 0) + 1;
    if (psych.primary_emotion) primaryEmotions[psych.primary_emotion] = (primaryEmotions[psych.primary_emotion] || 0) + 1;
  }

  const avg = (arr) =>
    arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "n/a";

  return {
    total: analyses.length,
    avg_scores: {
      shareability: avg(scores.shareability),
      novelty: avg(scores.novelty),
      personality_presence: avg(scores.personality),
      brand_readiness: avg(scores.brand),
      relatability: avg(scores.relatability),
      save_worthy: avg(scores.save_worthy),
      comment_bait: avg(scores.comment_bait),
    },
    hook_type_distribution: hookTypes,
    pillar_distribution: pillars,
    momentum_distribution: momentumRatings,
    tone_distribution: tones,
    editing_style_distribution: editingStyles,
    primary_emotion_distribution: primaryEmotions,
    gut_reads: analyses
      .filter((a) => a._gutRead)
      .map((a) => ({
        filename: a.filename,
        gut_read: a._gutRead,
        shareability: a.viral_signals?.shareability_score,
        momentum: a.creator_fit?.momentum_rating,
      })),
  };
}

async function generateInsightReport(analyses, stats) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not found in environment.");
  }

  const client = new Anthropic();

  const summaries = analyses.slice(-10).map((a) => ({
    filename: a.filename,
    hook: a.hook,
    viral_signals: a.viral_signals,
    creator_fit: a.creator_fit,
    script_tone: a.script?.tone,
    primary_emotion: a.psychology?.primary_emotion,
    gut_read: a._gutRead || null,
  }));

  const prompt = `You are a content strategy analyst working with Brian Ariyo — 24, Nigerian-American, mixed media artist from Dallas, 60K Instagram followers, slogan "Find Your Thing." He works in creator economy and is building toward consistent posting and brand deals.

Brian has analyzed ${stats.total} videos through his AI pipeline. Here is the aggregated data:

## Aggregate Stats
${JSON.stringify(stats, null, 2)}

## Recent Video Summaries (last 10)
${JSON.stringify(summaries, null, 2)}

Write a plain English insight report for Brian. Structure it exactly like this:

### What's Working
Patterns in high-shareability or high-novelty videos. Specific, not vague.

### Hook Patterns
Which hook types dominate and what that reveals about his instincts.

### Personality Gap
Honest read on personality presence scores. Don't soften it.

### Pillar Balance
Is he over-indexing on one pillar? What's missing from his library?

### Brand Deal Readiness
Trend across videos. What's holding it back.

### Gut Read vs Engine
If gut reads exist — where did Brian's instincts agree or disagree with the scores? What does that tell him?

### 3 Action Items
Concrete things to do in the next 3 videos. Numbered. Specific.

Write in Brian's language: direct, no corporate speak, honest even when it stings. Under 600 words total.`;

  const message = await client.messages.create({
    model: defaults.models.claude,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const timestamp = new Date().toISOString();
  return `# Video Intelligence Insights\n_Generated: ${timestamp} | Based on ${stats.total} videos_\n\n${message.content[0].text}`;
}

async function learn() {
  const count = getAnalysisCount();

  if (count < MIN_VIDEOS) {
    console.log(`\nNot enough data yet. You have ${count} video${count === 1 ? "" : "s"} analyzed.`);
    console.log(`Analyze at least ${MIN_VIDEOS} videos before running learn.js.\n`);
    process.exit(0);
  }

  console.log(`\nLoading ${count} analyses...`);
  const analyses = loadAllAnalyses();

  const stats = aggregateStats(analyses);

  console.log("Sending to Claude for pattern extraction...\n");
  const report = await generateInsightReport(analyses, stats);

  if (!fs.existsSync(INSIGHTS_DIR)) fs.mkdirSync(INSIGHTS_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
  const outputPath = path.join(INSIGHTS_DIR, `insights_${timestamp}.md`);
  fs.writeFileSync(outputPath, report);

  console.log(`Saved → ${outputPath}`);
  console.log(`\n${"=".repeat(60)}`);
  console.log(report);
  console.log(`${"=".repeat(60)}\n`);
}

process.on("unhandledRejection", (err) => {
  console.error("\nUnhandled error:", err.message || err);
  process.exit(1);
});

learn().catch((err) => {
  console.error("\nLearn error:", err.message);
  process.exit(1);
});
