const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");
const defaults = require("../config/defaults");

/**
 * Load a prompt template and fill in variables.
 * Templates use {{variable}} syntax.
 */
function loadPrompt(templateName, variables = {}) {
  const templatePath = path.join(__dirname, "../prompts", `${templateName}.txt`);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Prompt template not found: ${templatePath}`);
  }

  let prompt = fs.readFileSync(templatePath, "utf-8");

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    const replacement = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    prompt = prompt.replaceAll(placeholder, replacement);
  }

  return prompt;
}

/**
 * Generate content using Claude based on video analysis data.
 *
 * @param {object} analysis - Structured video analysis from Gemini
 * @param {object} options
 * @param {string} options.task - "script" | "breakdown" | "trends"
 * @param {string} options.niche - Content niche (from config or override)
 * @param {string} options.style - Content style preference
 * @returns {string} Claude's generated content
 */
async function generateFromAnalysis(analysis, options = {}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not found in environment. Copy .env.example to .env and add your key.");
  }

  const { task = "script", niche = defaults.niche, style = defaults.style } = options;

  // Map task names to prompt template files
  const taskTemplates = {
    script: "script-writer",
    breakdown: "breakdown",
    trends: "trend-spotter",
  };

  const templateName = taskTemplates[task];
  if (!templateName) {
    throw new Error(`Unknown task: "${task}". Use: script, breakdown, or trends`);
  }

  const userPrompt = loadPrompt(templateName, {
    niche,
    style,
    analysis,
  });

  const client = new Anthropic();

  console.log(`  Generating ${task} with Claude...`);

  const message = await client.messages.create({
    model: defaults.models.claude,
    max_tokens: defaults.maxTokens,
    messages: [{ role: "user", content: userPrompt }],
  });

  return message.content[0].text;
}

module.exports = { generateFromAnalysis };
