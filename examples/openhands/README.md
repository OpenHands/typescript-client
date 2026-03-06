# OpenHands UI Example

A full visual clone of the OpenHands web UI that uses the TypeScript client SDK to connect to an OpenHands Agent Server backend.

## Features

- **Chat Interface**: Send messages to the agent and view responses with markdown rendering
- **Terminal View**: Real-time terminal output from command executions
- **File Browser**: Browse files in the workspace
- **Settings**: Configure agent server URL, LLM model, and API key
- **Conversation Management**: Create, list, and delete conversations

## Architecture

This example demonstrates how to build a complete OpenHands-like experience using only the TypeScript client SDK:

- **RemoteConversation**: Manages conversation lifecycle (create, send messages, pause/resume/stop)
- **RemoteWorkspace**: Handles file operations and command execution
- **WebSocketCallbackClient**: Receives real-time events from the agent
- **HttpClient**: Makes REST API calls to the agent server

## Prerequisites

1. An OpenHands Agent Server running (e.g., via Docker)
2. An LLM API key (e.g., from Anthropic, OpenAI, or another provider)

## Quick Start

### 1. Start the Agent Server

```bash
docker run -d --name agent-server -p 8000:8000 \
  -v /tmp/agent-workspace:/workspace \
  ghcr.io/openhands/agent-server:main-python
```

### 2. Install Dependencies

```bash
cd examples/openhands
npm install
```

### 3. Start the Development Server

```bash
npm run dev
```

### 4. Configure Settings

1. Open http://localhost:3001 in your browser
2. Click the settings icon in the sidebar
3. Enter your LLM API key
4. Optionally adjust the agent server URL and model

### 5. Start a Conversation

Type a message in the input box on the home page and press Enter to create a new conversation.

## Project Structure

```
examples/openhands/
├── public/               # Static assets (favicon, etc.)
├── src/
│   ├── assets/          # Branding assets (logos)
│   ├── components/
│   │   ├── features/    # Feature-specific components
│   │   │   ├── chat/    # Chat interface components
│   │   │   ├── conversation/ # Conversation panel
│   │   │   ├── controls/    # Tab bar and controls
│   │   │   ├── files/       # File browser
│   │   │   ├── home/        # Home page components
│   │   │   ├── settings/    # Settings modal
│   │   │   ├── sidebar/     # Navigation sidebar
│   │   │   └── terminal/    # Terminal emulator
│   │   ├── layout/      # Layout components
│   │   └── shared/      # Shared/reusable components
│   ├── context/         # React contexts (client provider)
│   ├── icons/           # SVG icons
│   ├── pages/           # Page components
│   ├── stores/          # Zustand stores
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Technologies Used

- **React 19**: UI framework
- **React Router**: Client-side routing
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS
- **HeroUI**: Component library
- **Zustand**: State management
- **TanStack Query**: Server state management
- **XTerm.js**: Terminal emulator
- **React Markdown**: Markdown rendering

## Key Differences from OpenHands Frontend

This example is designed for **local mode only** and uses the **TypeScript client SDK** instead of the OpenHands backend directly:

1. **No authentication**: No login/logout flow
2. **No SaaS features**: No billing, user management, or cloud-specific features
3. **V1 conversations only**: No support for legacy V0 conversation format
4. **SDK-based**: Uses the TypeScript client SDK for all backend communication

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## License

MIT
