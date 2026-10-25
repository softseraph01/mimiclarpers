🎙️ MIMICLARPERS

Your scenes. Your voices. Your chaos.

MIMICLARPERS is a collaborative dubbing studio built for friends who want to bring movie scenes, clips, and other videos to life with their own voices. Upload a scene, join a room, record your dialogue, and create your own dubbed version together.

Whether you're recreating iconic movie moments or making something hilariously chaotic with friends, MIMICLARPERS gives you a space to make it happen.

🌐 Live Demo: https://mimiclarpers.vercel.app

---

✨ Features

- 🎬 Scene Uploads — Upload video scenes to use as the foundation for your dubbing projects.
- 🏠 Collaborative Rooms — Create or join rooms to work on dubbing projects with friends.
- 🎤 Voice Recording — Record your dialogue directly in the browser using your microphone.
- 🎚️ Audio Timeline — Arrange and manage audio clips in a studio-inspired, DAW-style workspace.
- 🎨 Multitrack Editing — Organize recordings into colored timeline clips for easier editing.
- ✂️ Clip Editing — Work with recorded audio clips and their timing in the editing timeline.
- 🔊 Audio Controls — Preview recordings and manage playback within the studio.
- 💾 Persistent Projects — Store project media and editing state so your work can continue across sessions.
- 🔐 Room Access Controls — Support for room membership and room-level access policies.
- 📱 Browser-Based Experience — Built as a web app, with Android/Chrome recording workflows in mind.

Features are under active development, and availability may vary by deployment.

---

🎧 The Studio Experience

MIMICLARPERS takes inspiration from digital audio workstations (DAWs), combining video playback with a multitrack audio-editing workflow.

The goal is simple:

1. Upload a scene.
2. Set up your dubbing room.
3. Record your voice while following the scene.
4. Arrange your recordings on the timeline.
5. Refine your clips and synchronize the dialogue.
6. Bring your version of the scene to life.

---

🛠️ Tech Stack

Technology| Purpose
React| User interface
TypeScript| Type-safe application development
Vite| Development server and build tooling
Supabase| Database, authentication infrastructure, storage, and realtime capabilities
PostgreSQL| Persistent relational data
MediaRecorder API| Browser-based audio recording
Vercel| Web app deployment
GitHub| Source control and collaboration

---

🏗️ Architecture

MIMICLARPERS uses a modern web application architecture:

- Frontend: React and TypeScript, built with Vite.
- Backend services: Supabase for database operations, authentication infrastructure, storage, and realtime features.
- Media: Browser recording APIs and project media storage.
- Deployment: Vercel for hosting the frontend.

The application is designed to keep room information, project data, and supported editing state available beyond a single browser session.

---

🚀 Getting Started

Prerequisites

- Node.js and npm
- A GitHub account
- A Supabase project for backend functionality

1. Clone the repository

git clone https://github.com/softseraph01/mimiclarpers.git
cd mimiclarpers

2. Install dependencies

npm install

3. Configure environment variables

Create a ".env.local" file in the project root:

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

Replace the placeholder values with the corresponding values from your Supabase project.

Important: Never expose a Supabase service-role key or other privileged secret in frontend environment variables.

4. Start the development server

npm run dev

Open the local URL printed in your terminal to access the application.

5. Build for production

npm run build

To preview the production build locally:

npm run preview

---

🗄️ Database & Storage

MIMICLARPERS uses Supabase to support its collaborative studio.

The database includes structures for:

- User profiles
- Rooms and room memberships
- Projects and room presence
- Project media assets
- Persistent editor state
- Timeline clips

Row Level Security (RLS) policies help control access to supported database operations.

Project media is managed through a private Supabase Storage bucket, with access governed by the application's storage policies.

Database migrations should be applied to the correct Supabase project before deploying changes that depend on them.

---

📱 Platform Support

MIMICLARPERS is a browser-based application.

- Desktop: Intended for modern browsers.
- Android: Designed with mobile browser recording workflows in mind.
- Microphone: Recording requires browser microphone permission and a compatible browser.
- Connectivity: Backend-backed features require an internet connection.

Performance and recording behavior may vary depending on the device, browser, and media format.

---

🗺️ Roadmap

MIMICLARPERS is an evolving project. Planned improvements include:

- [ ] More reliable real-time collaboration and room presence
- [ ] Improved audio/video synchronization
- [ ] Precise clip trimming and timeline editing
- [ ] Per-clip volume controls
- [ ] Audio-only export
- [ ] Combined dubbed video and audio export
- [ ] Better project recovery and persistence
- [ ] Improved mobile studio experience
- [ ] More robust recording and playback controls

The roadmap may change as development progresses.

---

🤝 Contributing

Contributions, suggestions, and bug reports are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Test your changes.
5. Submit a pull request describing what you changed.

For major changes, consider opening an issue first to discuss the proposed feature.

---

❤️ The Idea Behind MIMICLARPERS

MIMICLARPERS started with a simple idea: what if friends could dub scenes together without needing a professional recording studio?

No complicated setup. No expensive software. Just a scene, a few microphones, and friends ready to make something memorable.

Built for creativity, collaboration, and a little bit of chaos.

---

👨‍💻 Developer

Created by softseraph01.

Instagram: "@btw_beast07" (https://www.instagram.com/btw_beast07/)

---

<p align="center">
  🎙️ <strong>MIMICLARPERS</strong><br/>
  <em>Every scene deserves a new voice.</em>
</p>
