# Screenshots Directory

This directory contains screenshots for the README and documentation.

## Required Screenshots

| File | Description | Dimensions |
|------|-------------|------------|
| `mission-control.png` | Main dashboard overview | 1920x1080 |
| `hermes-workspace.png` | Hermes agent workspace | 1920x1080 |
| `command-room.png` | Command room / agent status center | 1920x1080 |
| `knowledge-graph.png` | Knowledge graph visualization | 1920x1080 |
| `swarm.png` | Multi-agent swarm coordination | 1920x1080 |
| `analytics.png` | Analytics/BI dashboard | 1920x1080 |
| `skill-library.png` | Skill library with collections | 1920x1080 |
| `voice-capture.png` | Voice capture interface | 1920x1080 |
| `context-injection.png` | Context injection engine | 1920x1080 |
| `memory-verification.png` | Memory verification center | 1920x1080 |
| `agent-config.png` | Agent configuration UI | 1920x1080 |
| `timeline.png` | Unified timeline view | 1920x1080 |

## Taking Screenshots

```bash
# Method 1: Browser DevTools
# 1. Open http://127.0.0.1:8765
# 2. Open DevTools (F12)
# 3. Click device toolbar (Ctrl+Shift+M)
# 3. Set to 1920x1080
# 4. Take screenshot (Ctrl+Shift+P > "Capture screenshot")

# Method 2: Puppeteer (automated)
npm install puppeteer
# Run scripts/capture-screenshots.js
```

## Light/Dark Mode

Take each screenshot in both themes:
- `dark/` - Default dark theme screenshots
- `light/` - Light theme screenshots

## Screenshot Naming Convention

```
{feature}-{theme}.png
e.g., dashboard-dark.png, dashboard-light.png
```

## Optimization

After capturing, optimize with:

```bash
# Install imagemin
npm install -g imagemin-cli imagemin-pngquant

# Optimize all
imagemin docs/images/*.png --out-dir=docs/images/
```

## Placeholder

Until real screenshots are captured, the README references these paths. The images will show as broken links until actual screenshots are added.

## Accessibility

All screenshots should have descriptive alt text in the README:
```markdown
![Mission Control Dashboard showing agent status, cost analytics, and system health](docs/images/mission-control.png)
```