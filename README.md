# DotRush

DotRush is a short-form brain-training game built around visual attention, working memory, impulse control, and pace discipline. Each session asks the player to trace shapes, choose the correct colors, avoid wrong taps, and finish under a focused time pressure.

The goal is not to look like a generic puzzle app. DotRush is designed to feel like a useful daily cognitive workout: quick to start, easy to understand, measurable after every run, and varied enough to keep players returning.

## What Makes It Useful

DotRush turns a simple dot-and-color game into repeatable cognitive drills:

- **Attention**: follow visual order without losing the next target.
- **Working memory**: keep shape sequence, color target, and board state in mind.
- **Inhibitory control**: avoid tapping the obvious wrong dot under pressure.
- **Processing speed**: complete clean runs without rushing into mistakes.
- **Consistency**: compare daily runs, best scores, weak modes, and training mix.

DotRush does not claim to diagnose or treat any condition. It is a wellness and skill-practice game, not a medical product.

## Training Modes

DotRush has six modes, each aimed at a different mental load:

| Mode | Trains | Player pressure |
| --- | --- | --- |
| **Time Trial** | Visual speed and steady scanning | Finish fast while staying accurate |
| **Challenge** | Composure under strict limits | Beat the countdown or fail the rep |
| **Daily Puzzle** | Habit, recall, and consistency | One shared daily board |
| **Endless** | Cognitive endurance | Keep solving as boards intensify |
| **Accuracy** | Impulse control | No timer, but mistakes matter more |
| **Speed Run** | Fast decision loops | Optimize completion time |

Difficulty levels become training loads:

- **Warm-up Load**: lower pressure for onboarding or recovery reps.
- **Training Load**: the normal daily workout.
- **Peak Load**: harder boards for sharper focus sessions.

## Core Loop

1. Pick a training mode.
2. Choose a difficulty load and visual theme.
3. Tap dots in sequence to complete each shape.
4. Choose the correct color for completed shapes.
5. Review your cognitive report card after the run.
6. Use the profile screen to see weak modes, average brain score, error rate, and recent training mix.

The app is intentionally session-sized. A useful run should take about one or two minutes, which makes it practical as a daily focus reset.

## Brain Score

DotRush records a brain score after each completed run. The score is intentionally simple and transparent:

- **Accuracy** rewards clean inputs and fewer wrong taps.
- **Control** rewards avoiding failed runs and careless actions.
- **Pace** rewards finishing efficiently without making the game only about raw speed.
- **Composite** combines those signals into a 0-100 training score.

The profile screen tracks best and average composite score by mode, total wrong taps, sessions completed, and the current weakest training area.

After each run, DotRush also gives an adaptive next-rep recommendation:

- **Increase load** when the player finishes cleanly with a high composite score.
- **Hold** when accuracy is good but pace or consistency needs another rep.
- **Recover** when the run fails or impulse errors are too high.

See [BRAIN_TRAINING_PROTOCOL.md](BRAIN_TRAINING_PROTOCOL.md) for the recommended daily routine and safety limits.

## Features

- React Native mobile app powered by Expo Router.
- Six training modes with distinct cognitive framing.
- Three difficulty loads with clear player guidance.
- Local progression, records, stars, unlocked themes, and daily streaks.
- Results screen with a readable cognitive report card.
- Adaptive post-run training recommendations.
- Shared daily training plan shown on Home and Profile.
- 7-day balance map that turns weak-mode data into a practical weekly routine.
- Mode selection marks today’s recommended reps directly in the list.
- Training-load screen explains what the selected session trains.
- Profile screen with a three-rep plan, weakest-mode focus, and training scoreboard.
- Optional real-time multiplayer lobby and room flow.
- Deterministic daily puzzle generation with seeded boards.
- Dark and light theme support.
- TypeScript-first codebase with build and logic tests.

## Project Structure

```text
.
|-- artifacts/
|   |-- mobile/              # Expo React Native app
|   |   |-- app/             # Screens and routes
|   |   |-- context/         # Player and game state
|   |   |-- engine/          # Puzzle, scoring, themes, brain scoring
|   |   `-- scripts/         # Mobile build helpers
|   |-- api-server/          # Express + WebSocket multiplayer server
|   `-- mockup-sandbox/      # Web mockup/build artifact
|-- scripts/
|   `-- test-brain-training.mjs
|-- package.json
|-- pnpm-workspace.yaml
`-- README.md
```

## Quick Start

Prerequisites:

- Node.js 18 or newer
- pnpm
- Expo-compatible mobile simulator, device, or Expo Go

Install dependencies:

```bash
pnpm install
```

Run the full verification gate:

```bash
pnpm run build
```

Run only the brain-training logic test:

```bash
pnpm run test
```

Run the mobile app:

```bash
cd artifacts/mobile
pnpm dev
```

Run the multiplayer API server:

```bash
cd artifacts/api-server
pnpm dev
```

## Environment

Mobile app:

```env
EXPO_PUBLIC_WS_URL=ws://localhost:8080/ws
```

API server:

```env
PORT=8080
```

When the mobile app is built locally, the workspace build helper defaults to `localhost:8081` for Metro to avoid common Windows shell and host issues.

## Verification

Current verification command:

```bash
pnpm run build
```

That command runs:

- `pnpm run test`
- `pnpm run typecheck`
- package builds for workspace artifacts that define a build script

The brain-training test validates:

- all six cognitive modes are described
- difficulty labels match the app copy
- clean runs score higher than messy runs
- adaptive recommendations distinguish increase and recovery reps
- daily training plans target uncovered and weakest cognitive systems
- weekly training plans start with a baseline rep and schedule the weakest system early
- training stats update averages, best score, wrong taps, and failed runs correctly

Expo may print patch-version warnings for installed SDK packages. Those warnings are non-blocking as long as the build and typecheck finish successfully.

## Architecture

### Mobile App

- **Framework**: Expo + React Native
- **Routing**: Expo Router
- **State**: React Context
- **Persistence**: AsyncStorage
- **UI**: StyleSheet-based themed components

### Game Engine

- `puzzleGenerator.ts`: seeded dot and shape generation
- `graphColoring.ts`: color assignment logic
- `scoring.ts`: gameplay score and stars
- `brainTraining.ts`: cognitive focus metadata and brain-score math
- `getDailyTrainingPlan`: shared daily prescription logic for Home and Profile
- `getWeeklyTrainingPlan`: 7-day balance map shown on Profile
- `BRAIN_TRAINING_PROTOCOL.md`: daily-use protocol and safety limits
- `themes.ts`: unlockable visual themes

### API Server

- **Framework**: Express
- **Realtime**: `ws`
- **Use case**: room creation, lobby state, reconnection, multiplayer readiness

## Design Principles

- **Fast entry**: players should start a useful rep in seconds.
- **Readable feedback**: results explain what improved and what to train next.
- **Guided choice**: mode and load selection explain why a rep matters before play starts.
- **Small sessions**: the game should fit into a work break, commute, or study reset.
- **Honest framing**: cognitive practice is useful, but the app avoids medical claims.
- **Low friction**: defaults are chosen so new players can play without setup decisions.

## Roadmap

High-impact next improvements:

- Haptic feedback for correct rhythm and wrong-tap recovery.
- Audio cues for attention and speed modes.
- Global and friend leaderboards.
- More adaptive difficulty based on recent score trends.
- Accessibility pass for colorblind palettes and larger tap targets.
- Multiplayer race mode with synchronized boards.

## License

MIT
