# 🪐 Zyrbit - The Ultimate Habit & Life Tracking Ecosystem

Zyrbit is a comprehensive, modern, and highly interactive life-management application. More than just a habit tracker, Zyrbit acts as your personal dashboard for daily routines, financial budgeting, fitness, studying, and community engagement. Built with an ergonomic "mobile-first" philosophy using React and Tailwind CSS, the app boasts a stunning UI and exceptionally smooth UX across all devices.

---

## ✨ Core Features & Modules

### 1. 🔄 Advanced Habit Tracking (Orbit)
- **Gravity Rings & Orbits**: Visualize your daily habits through immersive circular progress trackers (Gravity Rings) to see how close you are to completing your daily goals.
- **Habit Modal & Cards**: Add, edit, and fine-tune habits with detailed metadata (frequency, difficulty, type).
- **Gamification**: Earn experience points, rank up on the RankBanner, and unlock Achievement Badges for maintaining streaks. Features festive animations (Canvas Confetti) for major milestones.

### 2. 📓 The Omniverse Journal
A powerful, multi-tabbed journaling system designed to log every aspect of your day:
- **Diary (`JournalTabDiary`)**: Standard daily reflections, emotional logging, and private thoughts.
- **Money (`JournalTabMoney`)**: Log expenses, track daily budgets (`DailyBudget`), view lifetime transactions (`TransactionFeed`), and monitor your overarching financial health (`WalletOverview`).
- **Movement (`JournalTabMove`)**: Log workouts, fitness metrics, and physical activity progress.
- **Study & Productivity (`JournalTabStudy`)**: Organize studying with `StudyTasksTab` for distinct assignments, and `StudyNotesTab` for capturing learnings. Optimize focus in the `ZoneTab`.

### 3. 🤖 AI Coach
- Personalized insights driven by your habit data and journaling entries.
- Receive dynamic encouragement, streak-saving advice, and holistic life-management tips directly within the `AICoach` and `Coach` interfaces.

### 4. 📊 Deep Analytics & Stats
- **Heatmaps (`HeatmapGrid`)**: GitHub-style contribution heatmaps to visualize habit consistency over the year.
- **Trend Charts**: Powered by Recharts to give you beautiful graphical representations of your weekly summaries and lifetime stats.
- **Lifetime & Weekly Views**: See exactly how much money you saved, how many hours you studied, and how consistent you were over varying timeframes.

### 5. 🌍 Community & Challenges
- **Friends & Leaderboards**: Connect with peers, view their progress, and compete on the global or local `LeaderboardTab`.
- **Challenges (`ChallengesTab`)**: Opt into global or friend-group challenges to supercharge your motivation.
- **Social Orbit (`OrbitsTab`)**: Interact and motivate your friends directly within the ecosystem.

### 6. 📱 Seamless PWA Experience
- Installable on iOS/Android devices as a Progressive Web App (PWA) via the `InstallBanner`.
- App-like navigation with `BottomNav` for mobile and `DesktopSidebar`/`DesktopPanel` for large screens.

### 7. 🚀 Flawless Onboarding
- **Welcome Animation & Splash Screen**: Gorgeous introductory micro-animations setting the tone.
- **Goal Setup**: Tailor the app to your specific archetypes (e.g., student, professional, fitness enthusiast).

---

## 🛠️ Tech Stack & Architecture

### Frontend
- **React 19**: Utilizing the latest concurrent features for snappy rendering.
- **Vite 8**: Ultra-fast build tool and development server.
- **Tailwind CSS 4**: Modern utility-first styling with custom UI components.
- **Recharts**: For dynamic, SVG-based data visualizations.
- **Lucide React**: Crisp, modern iconography.
- **Vite PWA Plugin**: Manifests and service workers for native-like installation.

### Backend & Database
- **Supabase**: Open-source Firebase alternative providing PostgreSQL, real-time subscriptions, and authentication.
- **SQL Tables**: Extensive relational design including user habits, diary entries, challenges, financial tracking, and gamification metadata.

---

## 💻 Installation & Setup

### Prerequisites
- **Node.js** (v18+)
- **npm** or **yarn**
- A **Supabase** account (Free tier works perfectly)

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/zyrbit.git
cd zyrbit
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory. You will need your Supabase project URL and Anon Key.
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-super-long-anon-key
```

### 4. Database Initialization
Navigate to the root directory and execute the SQL files found within your local setup inside the Supabase SQL Editor:
- `Zyrbit_Full_Schema.sql`
- `challenges_table.sql`
- `diary_tables.sql`
- `money_savings.sql`

### 5. Run the App
```bash
npm run dev
```
The app will be accessible at `http://localhost:5173`.

---

## 📈 Deployment
To build the project for production (e.g., Vercel, Netlify, Render):
```bash
npm run build
```
Ensure your `.env` variables are successfully added to your hosting provider's build settings.

---

## 🤝 Contributing
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
