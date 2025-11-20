# Graph Starz

Graph Starz is a graph-based image upload and sharing platform that leverages AI (Google Gemini) to create a coherent global graph of interconnected images, users, and attributes.

## Features

- **Interactive Graph Visualization**: Force-directed graph rendering using D3.js with zoom, pan, and node interactions.
- **AI-Powered Analysis**: Automatically generates titles, descriptions, and tags for uploaded images using Google Gemini 2.5 Flash.
- **Semantic Connections**: visualizes relationships between Users, Images, and Attributes.
- **Google Authentication**: Secure sign-in with whitelist/waitlist functionality.
- **Dark Mode UI**: Polished, space-themed interface built with Tailwind CSS.

## Prerequisites

- Node.js (v18 or higher)
- A Google Cloud Project with:
  - **Gemini API Key** (AI Studio)
  - **OAuth 2.0 Client ID** (Google Identity Services)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/graph-starz.git
   cd graph-starz
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

## Configuration

This project requires environment variables to function correctly. Create a `.env` file in the root directory:

```env
# Required for Image Analysis
API_KEY=your_google_gemini_api_key_here

# Required for Authentication
GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
```

### How to get keys:
1. **Gemini API Key**: Visit [Google AI Studio](https://aistudio.google.com/) to generate an API key.
2. **Google Client ID**: 
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Create a project and configure the OAuth Consent Screen.
   - Create Credentials > OAuth Client ID (Web Application).
   - Add `http://localhost:3000` (or your dev URL) to "Authorized JavaScript origins".

## Whitelist / Waitlist

By default, the application is gated. Only users in the whitelist can access the main graph.

To manage access:
1. Open `constants.ts`.
2. Add authorized email addresses to the `WHITELIST` array:
   ```typescript
   export const WHITELIST = [
     'demo@example.com',
     'your.email@gmail.com' 
   ];
   ```

## Running the App

Start the development server:

```bash
npm start
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite/Webpack
- **Styling**: Tailwind CSS
- **Visualization**: D3.js
- **AI**: Google Gemini SDK (@google/genai)
- **Auth**: Google Identity Services (GSI)
