# 🚀 InternAI - AI-Powered Recruitment & Career Accelerator

**InternAI** is a dual-sided platform bridging the gap between students and recruiters. It utilizes Local LLMs (Ollama) to provide AI-driven resume analysis, automated candidate screening, and personalized career upskilling paths.

---

## ✨ Features

### 🎓 For Students
* **AI Resume Analysis:** Get instant feedback, match scores against JDs, and visual skill gap analysis.
* **Smart Job Board:** Apply to jobs with a predicted "Win Probability" and tailored resume summaries.
* **Career Copilot:**
    * **Resume Tailor:** Auto-rewrites summaries to match specific job descriptions.
    * **Cover Letter Generator:** Drafts personalized letters in seconds.
    * **Project Recommendations:** Suggests unique capstone projects to fill skill gaps, complete with a "Start Building" tracker.
* **Application Tracker:** Kanban-style tracking with real-time status updates from recruiters.

### 💼 For Recruiters
* **Smart Pipeline:** View candidates ranked by AI match score rather than just application date.
* **AI Tools:**
    * **Auto-Shortlist:** One-click filtering of top candidates based on semantic matching.
    * **Smart Search:** Filter talent using natural language (e.g., *"Find candidates who know Docker"*).
    * **Draft Communications:** Auto-generate interview invites or constructive rejection emails based on candidate data.
    * **Interview Prep:** Generate candidate-specific interview questions.

### 💬 Platform Features
* **Real-Time Chat:** Integrated messaging system for direct communication between students and recruiters.
* **Secure Authentication:** Role-based access via Supabase Auth.

---

## 🛠️ Tech Stack

* **Frontend:** React.js, Tailwind CSS, Recharts, Framer Motion, Lucide React
* **Backend:** Python (FastAPI), Uvicorn
* **Database:** Supabase (PostgreSQL + Realtime)
* **AI Engine:** Ollama (Running locally with `phi3` or similar models)

---

## ⚙️ Prerequisites

1.  **Node.js** (v16 or higher)
2.  **Python** (v3.9 or higher)
3.  **Ollama**: [Download & Install](https://ollama.com/)
    * Run `ollama pull phi3` (or the model specified in `job.py`) to prepare the AI.
4.  **Supabase Account**: Create a project to get your URL and Keys.

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone [https://github.com/yourusername/intern-ai.git](https://github.com/yourusername/intern-ai.git)
cd intern-ai
```
2. Backend Setup
Navigate to the root directory (where job.py is located):

```Bash

# Optional: Create a virtual environment
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn supabase requests pydantic python-multipart

# Start the server
uvicorn job:app --reload
The backend will run on http://localhost:8000.

3. Frontend Setup
Navigate to the frontend directory (e.g., client or root if mixed):

Bash```
# Install Node dependencies
npm install
# Start the React app
npm run dev

The frontend will typically run on http://localhost:5173.

🗄️ Database Schema (Supabase SQL)
Run the following SQL in your Supabase SQL Editor to set up the required tables for the platform to function correctly:
```
SQL
```
-- 1. Jobs Table
create table public.jobs (
  id uuid default uuid_generate_v4() primary key,
  title text,
  company text,
  location text,
  description text,
  recruiter_email text,
  posted_by uuid references auth.users,
  status text default 'Open',
  created_at timestamp with time zone default now()
);

-- 2. Applications Table
create table public.applications (
  id uuid default uuid_generate_v4() primary key,
  job_id uuid references public.jobs on delete cascade,
  user_id uuid references auth.users,
  candidate_name text,
  email text,
  resume_text text,
  cover_letter text,
  status text default 'New', -- 'New', 'Shortlisted', 'Rejected', 'Hired'
  match_score int,
  github_link text,
  created_at timestamp with time zone default now()
);

-- 3. Messages Table (Chat & System Notifications)
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references auth.users,
  receiver_id uuid references auth.users,
  job_id uuid references public.jobs,
  content text,
  type text default 'text', -- 'text' or 'email_update'
  created_at timestamp with time zone default now()
);

-- 4. Student Projects (For Upskilling)
create table public.student_projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users,
  title text,
  description text,
  tech_stack text,
  tasks jsonb, -- Stores array of checkpoints
  status text default 'In Progress',
  progress int default 0,
  created_at timestamp with time zone default now()
);

-- 5. Profiles (User Roles)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  role text default 'student', -- 'student' or 'recruiter'
  avatar_url text,
  plan text default 'free',
  plan_status text default 'active'
);
```
-- Enable Realtime for Chat
alter publication supabase_realtime add table messages;
-- Enable Realtime for Chat
alter publication supabase_realtime add table messages;
📸 How to Use
For Students:
Sign Up: Create a "Student" account.

Analyze: Go to the Dashboard, upload your resume, and paste a JD to check your match score.

Upskill: If you lack skills, click the "Improve" bulb 💡 in the Application Tracker to generate a project idea.

Apply: Use the Job Board to apply with one click (or tailor your resume first).

For Recruiters:
Sign Up: Create a "Recruiter" account.

Post: Create a new job listing.

Manage: Go to the Dashboard to see your active pipeline.

Shortlist: Use "AI Auto-Shortlist" to filter candidates > 75% match.

Contact: Click the "Eye" icon 👁️ on a candidate to view details and send AI-drafted emails directly to their tracker.

🤝 Contributing
Contributions are welcome! Please open an issue or submit a pull request.

📄 License
This project is open-source and available under the MIT License.
