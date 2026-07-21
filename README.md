# 🚀 Proposal Generator Agent
**AI-Powered Autonomous Proposal & Marketing Assistant**  
*Built for **Atoms Digital Solutions***

---

## 📌 Overview

**Proposal Generator Agent** is a cutting-edge, autonomous AI assistant designed to streamline the client onboarding and proposal creation workflow for digital marketing agencies, healthcare institutions, and enterprise consultants. 

By leveraging state-of-the-art Large Language Models (**Google Gemini**, **Anthropic Claude**) combined with a high-performance **React 19** frontend and **Supabase** cloud persistence, the agent conducts intelligent conversational interviews, extracts structured marketing deliverables, calculates pricing breakdowns in real time, and synthesizes stunning HTML/PDF proposals on demand.

---

## ✨ Key Features

### 🤖 1. Autonomous Conversational Intake & Brief Parsing
* **Step-by-Step Guided Interviews:** The AI agent asks targeted follow-up questions to gather client details, target demographics, required platforms, timeline, budget, and custom add-ons.
* **Batch Paste Support:** Clients or account managers can paste structured or unstructured briefs directly into chat for instant parsing.
* **Real-Time Pricing Calculation:** Automatically maps deliverables and add-ons to standardized pricing models, displaying an interactive summary card for review before generation.

### 📄 2. Live HTML Proposal Rendering & Export
* **Instant Visual Preview:** Generates fully responsive, beautifully formatted HTML proposals displayed directly inside a sleek modal viewer.
* **Seamless Export:** One-click export to professional **PDF documents** or downloadable standalone HTML files using integrated browser rendering engines.
* **Refinement Loop:** Chat dynamically with the agent while viewing the summary to tweak pricing, adjust deliverables, or modify terms—the proposal updates seamlessly.

### 🛠️ 3. Hidden System Prompt Studio & AI Co-pilot
* **Cloud Persistence & Hydration:** Saved prompt rules are stored directly in **Supabase**, instantly applying across all user sessions without code deployments.
* **🤖 Prompt Co-pilot Assistant:** An integrated AI side-drawer that evaluates prompt modification safety, prevents JSON schema breakage, and provides one-click code snippet insertion.

### ☁️ 4. Cloud Session Management & History
* **Persistent Chat Sidebar:** Easily navigate, rename, reload, or delete past proposal sessions.
* **Supabase Database Sync:** Automatically serializes chat messages, proposal JSON data, and client metadata to PostgreSQL, ensuring zero data loss across browser reloads or devices.

### 🎨 5. Premium UI/UX & WebGL Aesthetics
* **LiquidEther Shaders:** Features a dynamic, interactive WebGL fluid background shader powered by Three.js.
* **Modern Glassmorphism:** Sleek dark mode aesthetic with smooth micro-animations and transitions powered by **Framer Motion**.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology / Library | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) | High-performance, reactive user interface and speedy bundling |
| **Styling & Animation** | Vanilla CSS, [Framer Motion](https://www.framer.com/motion/), [Three.js](https://threejs.org/) | Premium glassmorphic UI, fluid animations, and WebGL shaders |
| **Backend Storage** | [Supabase](https://supabase.com/) (PostgreSQL & REST API) | Cloud persistence for chat history, sessions, and system prompts |
| **AI & LLM Engine** | Google Gemini (`@google/generative-ai`), Anthropic Claude | Natural language understanding, JSON extraction, and proposal synthesis |
| **Document Export** | `html2pdf.js`, `file-saver` | In-browser PDF generation and file downloading |

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: `v18.0.0` or higher
* **npm** or **pnpm**
* **Supabase Project**: A valid Supabase instance with PostgreSQL database
* **AI API Key**: Google Gemini API key (or Anthropic Claude)

---

### 1️⃣ Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/patanabdul2006-crypto/proposal-generator.git
cd proposal-generator
npm install
```

---

### 2️⃣ Environment Configuration
Copy the sample environment file and configure your API keys:
```bash
cp .env.example .env
```

Open `.env` and fill in your credentials:
```env
# Gemini API Configuration
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_MODEL=gemini-3.1-flash-lite

# Supabase Cloud Database
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

### 3️⃣ Database Schema Setup
Run the included SQL migration scripts inside your Supabase **SQL Editor** to create the required tables and security policies:

1. Execute `supabase/migrations/supabase_schema.sql` *(Core proposal sessions table)*
2. Execute `supabase/migrations/supabase_migration_chat_history.sql` *(Chat history and serialization)*
3. Execute `supabase/migrations/supabase_migration_system_prompts.sql` *(Dynamic system prompt persistence)*

---

### 4️⃣ Start Development Server
Launch the local development server with Hot Module Replacement (HMR):
```bash
npm run dev
```
Open your browser and navigate to: `http://localhost:5173`

---

## 🔐 Accessing the Admin Prompt Studio

To access the hidden system prompt editor and configure AI behavior:
1. Navigate to `http://localhost:5173/#/atom-admin` in your browser.
2. Select between the **Collection Prompt** (intake rules) and **Generation Prompt** (HTML output rules).
3. Modify rules directly in the editor or open the **🤖 Prompt Co-pilot** drawer on the right for AI-assisted prompt engineering.
4. Click **Save Prompt** (`Ctrl+S`) to persist changes to Supabase. All new chat sessions will immediately adopt the updated instructions.

---

## 📂 Project Structure

```text
proposal-generator/
├── public/                 # Static assets and icons
├── src/                    # Application source code
│   ├── api/                # AI provider integration (Gemini / Claude)
│   ├── assets/             # Brand logos and images
│   ├── components/
│   │   ├── admin/          # PromptAdminPage & AI Co-pilot chat drawer
│   │   ├── chat/           # ChatInterface, ChatMessage, TypingIndicator
│   │   ├── layout/         # Persistent Sidebar, Header, Logo, PromptPanel
│   │   ├── proposal/       # Live HTML ProposalViewer & Modal
│   │   └── ui/             # LiquidEther WebGL background & SplashScreen
│   ├── hooks/              # Custom React hooks (useChat, useProposal)
│   ├── lib/                # Supabase client initialization
│   ├── prompts/            # Hardcoded default Collection & Generation prompts
│   └── utils/              # Prompt manager, session storage, and chat history
├── supabase/
│   └── migrations/         # Database schemas and SQL migration scripts
├── .env.example            # Environment variables template
├── package.json            # Project dependencies and scripts
└── vite.config.js          # Vite bundler configuration
```

---

## 🤝 Contributing & Workflow
* **Code Style:** Ensure all new UI components adhere to the established glassmorphic design system and responsive layout guidelines.
* **Prompt Modifications:** When modifying default prompts in `src/prompts/`, verify changes using the Admin Co-pilot safety evaluator before committing.

---

## 📜 License & Copyright
**© 2026 Atoms Digital Solutions.** All rights reserved.  
*Unauthorized copying, distribution, or modification of this software is strictly prohibited.*
