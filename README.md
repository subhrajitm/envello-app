# Envello - Tauri Note Taking App

A modern, dark-themed note-taking and project management application built with Tauri, React, and TypeScript.

## Features

- 📝 Project management with status tracking
- ✅ Task management with priorities
- 📊 Dashboard with productivity metrics
- 🎨 Dark theme UI
- ⚡ Built with Tauri for native performance
- 🔍 Quick search functionality

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Rust (latest stable version)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Install Tauri CLI (if not already installed):
```bash
npm install -g @tauri-apps/cli
```

### Development

Run the app in development mode:
```bash
npm run dev
```

This will start both the Vite dev server and the Tauri app.

### Build

Build the app for production:
```bash
npm run build
```

This will create a production build in the `dist` folder and compile the Tauri app.

### Tauri Commands

- `npm run tauri dev` - Run in development mode
- `npm run tauri build` - Build for production

## Project Structure

```
envello-app/
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── App.tsx            # Main app component
│   └── main.tsx           # Entry point
├── src-tauri/             # Tauri backend
│   ├── src/
│   │   └── main.rs        # Rust entry point
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── package.json           # Node.js dependencies
└── vite.config.ts         # Vite configuration
```

## Technologies

- **Frontend**: React 18, TypeScript, CSS
- **Backend**: Tauri (Rust)
- **Build Tool**: Vite
- **UI**: Custom dark theme inspired by modern design systems

## License

MIT