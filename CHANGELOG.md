# Changelog

All notable changes to Dot Rush will be documented in this file.

## [Unreleased] - 2024-01-XX

### Added
- **Pause/Resume Functionality**
  - Modal pause menu with resume and quit options
  - Timer automatically pauses when game is paused
  - Pause button in game header (top right)
  
- **Endless Mode Progression**
  - Auto-generates next level on puzzle completion
  - Modal with "Next Level" and "End Run" options
  - Level counter displayed in game header
  - Cumulative score tracking across levels
  - Endless streak tracking

- **Daily Puzzle Validation**
  - Prevents multiple plays of daily puzzle per day
  - Shows completion checkmark on modes screen
  - Daily streak counter with fire emoji
  - Alert when attempting to replay daily puzzle

- **WebSocket Reconnection**
  - Automatic reconnection with exponential backoff
  - Maximum 5 reconnection attempts
  - Reconnecting/reconnected user alerts
  - Proper cleanup to prevent memory leaks

- **Connection Status Indicator**
  - Real-time connection status in multiplayer screen
  - Visual feedback with colored WiFi icon (green/red)
  - Connection status text (Connected/Disconnected)

### Fixed
- TypeScript errors in `useLobbyWs.ts` related to `process.env` access
- Cross-environment compatibility for WebSocket URL detection
- Memory leaks in WebSocket connection lifecycle

### Changed
- Game state now includes `isPaused` and `endlessLevel` fields
- GameContext API expanded with `pauseGame`, `resumeGame`, `nextEndlessLevel`
- PlayerContext API expanded with `hasDailyBeenPlayed` method
- Modes screen now shows daily streak and completion status
- Endless mode header shows current level number

### Technical Improvements
- Improved WebSocket error handling and recovery
- Better state management for pause/resume
- Enhanced daily puzzle tracking logic
- Cleaner TypeScript types for WebSocket events

## [0.1.0] - Initial Release

### Core Features
- 6 game modes (Time Trial, Challenge, Daily, Endless, Accuracy, Speed Run)
- 3 difficulty levels (Easy, Medium, Hard)
- 6 color themes with unlock progression
- Puzzle generation with seeded RNG
- Graph coloring algorithm
- Star rating system
- Hint and color reveal power-ups
- Personal best tracking
- Profile with stats

### Multiplayer
- WebSocket-based real-time multiplayer
- Room creation with 4-digit codes
- Host controls (kick, ban, mode selection)
- Team assignment for 2v2 modes
- Synchronized game start with countdown

### UI/UX
- Dark/light mode support
- Animated home screen
- Responsive canvas rendering
- Score toasts
- Progress bars
- Modal dialogs
