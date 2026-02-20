# Envello

Envello is a powerful, distraction-free note-taking and productivity application designed for writers, researchers, and developers. Built with modern web technologies and wrapped in a native shell, it combines the flexibility of the web with the performance of a desktop application.

![Envello Banner](assets/banner.png) *Add a banner image if available*

## 🚀 Features

Envello is organized into specialized modules to cater to different creative and productive needs:

-   **📖 Novels & Fiction:** A dedicated writing environment for long-form fiction with chapter management.
-   **🔬 Research:** Organize sources, citations, and research notes.
-   **📝 Daily Notes:** Capture fleeting thoughts and daily logs.
-   **✅ Tasks & Todos:** Integrated task management to keep you on track.
-   **📅 Meetings:** Record meeting notes and action items.
-   **📚 Books/Reading:** Track your reading list and book notes.
-   **💻 Code Snippets:** Store and manage useful code blocks.
-   **📔 Journals:** Personal journaling and reflection.
-   **✍️ Articles/Blogs:** Draft and manage blog posts and articles.
-   **🤖 AI Assistance:** Integrated advanced AI models (OpenAI, Anthropic Claude, Google Gemini, xAI Grok, Ollama) for drafting, rewriting, and brainstorming inside your notes.
## 🏗 Architecture & Tech Stack

Envello uses a hybrid architecture leveraging the robustness of Rust and the agility of Angular.

### Technology Stack

-   **Frontend:** Angular 19+ (Standalone Components, Signals, Reactive Forms)
-   **Backend/Native Shell:** Tauri (Rust) for cross-platform desktop capability.
-   **Database:** SQLite (Local storage for robust data persistence).
-   **Styling:** Modern CSS3 with CSS Variables for theming (Dark/Light mode support).

### High-Level Architecture

The application follows a **Modular Monorepo** architecture using Nx:

1.  **Apps (`apps/`)**:
    -   **`desktop`**: The Tauri-based desktop application.
    -   **`web`**: The web-based version of the application.
    -   Both apps act as "shells" that consume shared logic and UI components.

2.  **Shared UI (`libs/ui`)**:
    -   Contains all reusable UI components, including:
        -   **Auth**: Login, Sign Up forms.
        -   **Layout**: Header, Footer, Sidebar.
        -   **Core**: Buttons, Inputs, Modals, Logos.
    -   Apps import these components to ensure 100% visual consistency.

3.  **Core Services (`libs/core`)**:
    -   **`SqliteService`**: Manages local SQLite database (Desktop only).
    -   **`TauriService`**: Bridges webview and Rust backend (Desktop only).
    -   **`AuthService`**: Handles authentication state.
    -   **`DataService`**: Abstract interface for data peristence strategies.

### Data Flow

```mermaid
graph LR
    User[User Interaction] --> UI[@envello/ui Components]
    UI --> App[App Shell (Desktop/Web)]
    App --> Service[@envello/core Services]
    Service --> State[Reactive State (Signals)]
    
    subgraph Desktop
    Service --> SQLite[SqliteService]
    SQLite -- Tauri --> Rust[Rust Backend]
    end
    
    subgraph Web
    Service --> WebDB[Supabase / PouchDB]
    end
```

## 🛠 Development

### Prerequisites

-   **Node.js**: v20+
-   **npm**: v9+
-   **Rust**: Latest stable (for Tauri development)

### Installation

```bash
# Install NPM dependencies
npm install

# Check Rust environment (if developing backend)
cargo --version
```

### Running Locally

```bash
# Run the web application
npx nx serve web

# Run the desktop application
npx nx serve desktop
```

## 📦 Build & Deployment

| Command | Description | Output |
| :--- | :--- | :--- |
| `npx nx build web` | Build web application | `dist/apps/web` |
| `npx nx build desktop` | Build desktop frontend | `dist/apps/desktop` |
| `npx nx run tauri build` | Build native desktop binaries | `src-tauri/target/release` |

## 📂 Project Structure

```
envello/
├── apps/
│   ├── desktop/         # Main desktop application (Tauri + Angular)
│   └── web/             # Web application (Angular)
├── libs/
│   ├── core/            # Singleton services (Auth, SQLite, Logging)
│   ├── ui/              # Shared UI components (Auth, Layout, Widgets)
│   ├── feature-*/       # Feature-specific libraries (Tasks, Novels, etc.)
│   └── domain/          # Shared interfaces and types
├── src-tauri/           # Rust backend configuration
└── dist/                # Build artifacts
```

## 🗺 Roadmap

See [ENTERPRISE_IMPROVEMENTS.md](./ENTERPRISE_IMPROVEMENTS.md) for our detailed roadmap towards enterprise-grade attributes, including:
-   Remote Sync & Cloud Backup
-   Enhanced Security & Encryption
-   CI/CD Pipelines
-   Internationalization (i18n)

## 📄 License

Proprietary/Private.
