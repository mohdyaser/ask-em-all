# Ask Em All - Multi-LLM Comparison App

## Overview

**Ask Em All** is a web application designed for testing and comparing responses from multiple Large Language Models (LLMs) simultaneously. It leverages the OpenRouter API to provide access to a wide variety of models through a single interface.

## Purpose

- Send the same prompt to multiple LLMs at once for comparison
- Maintain separate chat histories for each model
- Allow continuation of individual conversations after comparison
- Enable quick A/B testing of model responses

## Core Features

### 1. API Key Management
- Users provide their own OpenRouter API key
- Key is stored locally in browser (localStorage)
- Validation on entry to ensure key works

### 2. Model Selection
- Fetch available models from OpenRouter's `/api/v1/models` endpoint
- Searchable dropdown/list for model selection
- Multi-select capability to choose which models to compare
- Display model metadata (name, pricing, context length)

### 3. Tab-Based Interface
- **"Ask Em All" tab**: Main comparison view where messages are sent to all selected models
- **Individual model tabs**: Dedicated tab per selected model showing its chat history
- Dynamic tab creation based on selected models

### 4. Chat Functionality
- Markdown rendering for responses
- Streaming responses (if supported)
- Loading indicators per model
- Error handling and display

### 5. Chat History
- Per-model conversation history
- History persists across tab switches
- Option to clear individual or all histories

## Technical Architecture

### Stack
- **Python**: Core application logic
- **Gradio**: Web UI framework (easy tabbed interface, chatbots, state management)
- **Requests**: HTTP client for OpenRouter API

### API Integration
- **OpenRouter API**: 
  - `GET /api/v1/models` - Fetch available models
  - `POST /api/v1/chat/completions` - Send chat messages

### Data Flow
```
User Input → Ask Em All Tab → Parallel API Calls to All Selected Models
                           ↓
          Each Model's Response → Update corresponding tab with response
                           ↓
          Store in per-model chat history
```

### Storage
- API key: `localStorage`
- Selected models: `localStorage`
- Chat histories: In-memory (session-based), optionally `localStorage`

## API Request Format

```javascript
// OpenRouter Chat Completion Request
{
  "model": "openai/gpt-4",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello!" }
  ],
  "stream": false
}
```

## UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Ask Em All                          [API Key: ****] [⚙️]   │
├─────────────────────────────────────────────────────────────┤
│  Model Selection: [Search models...        ] [+ Add]        │
│  Selected: [GPT-4] [Claude-3.5] [Gemini Pro] [×]           │
├─────────────────────────────────────────────────────────────┤
│  [Ask Em All] [GPT-4] [Claude-3.5] [Gemini Pro]  ← Tabs    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Chat messages area (scrollable)                            │
│                                                             │
│  - In "Ask Em All": Side-by-side or stacked responses      │
│  - In model tabs: Single conversation view                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Message input field                        ] [Send]       │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
ask-em-all/
├── app.py           # Main Gradio application
├── requirements.txt # Python dependencies
├── app.md           # This documentation
└── idea.md          # Future feature ideas
```

## Security Considerations

- API keys are stored in browser localStorage only
- Keys never sent to any server except OpenRouter
- CORS handled by OpenRouter API
- No backend required - fully client-side application
