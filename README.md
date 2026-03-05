# Video Intelligence Pipeline

AI-powered video analysis for content creators. Uses **Gemini** to understand what makes videos work and **Claude** to generate better content from those insights.

## What It Does

1. **Analyze** — Feed a video to Gemini, get back a structured breakdown of hooks, pacing, psychology, production quality, and viral potential
2. **Generate** — Feed that analysis to Claude to produce new scripts, detailed breakdowns, or trend reports
3. **Batch** — Analyze multiple videos at once to spot patterns and predict trends in your niche

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd video-intelligence
npm install
```

### 2. Add your API keys

```bash
cp .env.example .env
```

Edit `.env` and add your keys:
- **Gemini API key**: Get one free at [Google AI Studio](https://aistudio.google.com/apikey)
- **Anthropic API key**: Get one at [Anthropic Console](https://console.anthropic.com/)

### 3. Drop a video in the videos/ folder

```bash
cp ~/Downloads/viral-video.mp4 videos/
```

### 4. Run it

```bash
# Generate a new script based on a viral video
node src/pipeline.js videos/viral-video.mp4 script

# Get a detailed breakdown of why a video works
node src/pipeline.js videos/viral-video.mp4 breakdown

# Analyze the trend behind a video
node src/pipeline.js videos/viral-video.mp4 trends
```

## Batch Analysis (Trend Detection)

Drop multiple videos in a folder and run:

```bash
# Analyze all videos in the default videos/ folder
node src/batch.js

# Analyze videos in a specific folder for a specific niche
node src/batch.js ~/Downloads/tiktok-saves/ fitness
```

This analyzes every video, then sends all the data to Claude to identify patterns, predict trends, and suggest content opportunities.

## Project Structure

```
video-intelligence/
├── src/
│   ├── pipeline.js          # Main entry point (single video)
│   ├── batch.js             # Batch mode (multiple videos → trend report)
│   ├── analyze-video.js     # Gemini API integration
│   └── generate-content.js  # Claude API integration
├── prompts/                 # Editable prompt templates (tweak these!)
│   ├── video-analysis.txt   # What Gemini looks for in a video
│   ├── script-writer.txt    # How Claude writes new scripts
│   ├── breakdown.txt        # How Claude evaluates a video
│   └── trend-spotter.txt    # How Claude detects trends across videos
├── config/
│   └── defaults.js          # Niche, style, model versions
├── output/                  # Results land here
│   ├── analyses/            # Raw Gemini JSON
│   ├── scripts/             # Generated scripts
│   ├── breakdowns/          # Video breakdowns
│   └── trends/              # Trend reports
├── videos/                  # Drop your mp4s here
└── mcp-server/              # Future: Claude Code integration (stub)
```

## Customization

### Change your niche and style
Edit `config/defaults.js` or pass them as arguments:
```bash
node src/pipeline.js videos/clip.mp4 script fitness
```

### Tune the prompts
The real magic is in the `prompts/` folder. Edit these freely — they're plain text templates with `{{variable}}` placeholders. The better your prompts, the better your output.

### Supported video formats
mp4, mov, avi, webm

## Costs

- **Gemini**: Free tier is generous for experimentation. Check [Google AI pricing](https://ai.google.dev/pricing) for production use.
- **Claude**: Each pipeline run uses roughly 2,000-4,000 tokens. Check [Anthropic pricing](https://www.anthropic.com/pricing) for current rates.

## Next Steps

- [ ] Get the single-video pipeline working with one video
- [ ] Tune the Gemini prompt for your specific niche
- [ ] Run batch analysis on 10-20 videos to get meaningful trend data
- [ ] Build out the MCP server for Claude Code integration (see `mcp-server/`)

## License

MIT
