export const projectSuggestions = {
  // Core Web & Frontend
  "react": [
    "Build a **Personal Portfolio Website** with dark mode, animations, and blog using React + Tailwind + Framer Motion (Showcase your InternAI projects here!)",
    "Create a **Real-time Job Tracker Dashboard** – track applications, status, and reminders (perfect for your own internship hunt)",
    "Develop a **Resume Builder App** – drag-and-drop sections, AI-generated suggestions, export to PDF",
  ],
  "javascript": [
    "Make a **Chrome Extension** that auto-fills job applications with your data (super useful for recruiters too)",
    "Build an **Interactive Coding Quiz Platform** with timer, scoring, and leaderboard",
  ],
  "typescript": [
    "Convert your current InternAI frontend to TypeScript for better maintainability and type safety",
    "Create a **Type-safe Task Manager** with drag-and-drop using React DnD",
  ],

  // Backend & APIs
  "fastapi": [
    "Build a **Full Internship Recommendation API** – input resume text → output matched jobs + missing skills (integrate with your existing /match endpoint)",
    "Develop a **Secure File Upload Service** for resumes with Supabase Storage + JWT auth",
  ],
  "python": [
    "Create a **LinkedIn Job Scraper** that extracts internships and saves them to Supabase",
    "Build an **AI Cover Letter Generator** using OpenAI API or Hugging Face models",
  ],
  "supabase": [
    "Implement **Real-time Resume Version History** – users see live updates when they save optimized versions",
    "Build a **Collaborative Resume Review App** – recruiters and students edit together in real-time",
  ],

  // AI & Machine Learning
  "machine learning": [
    "Train a **Resume-Job Matching Model** using Sentence Transformers – improve your current semantic matcher",
    "Build a **Fake Job Detector** with advanced features (add BERT or fine-tune on internship listings)",
  ],
  "nlp": [
    "Create an **ATS Keyword Optimizer** – scan resume, suggest missing keywords from job description",
    "Develop a **Bullet Point Rewriter** – input weak bullet → output XYZ formula version (like your BulletOptimizer)",
  ],

  // DevOps & Cloud
  "docker": [
    "Containerize InternAI backend + frontend and deploy with Docker Compose locally",
    "Set up a **Multi-container Internship Platform** (FastAPI + React + Supabase + Redis)",
  ],
  "aws": [
    "Deploy InternAI on **AWS Amplify** (frontend) + Lambda (backend) + S3 (resume storage)",
    "Build an **Automated Resume PDF Generator** using Lambda + pdf-lib",
  ],

  // Databases & Full-Stack
  "sql": [
    "Design a complete **Internship Application Database** – users, jobs, applications, resumes, match scores",
    "Write advanced SQL queries for recruiter dashboard (top candidates, skill gaps report)",
  ],
  "postgresql": "Build a **Job Board Analytics Dashboard** – track application trends, popular skills, etc.",

  // Bonus Modern & Trending
  "nextjs": "Migrate your StudentDashboard to Next.js 14 with App Router + Server Components",
  "tailwindcss": "Create a beautiful **Design System** for InternAI (buttons, cards, modals) reusable across app",
  "vite": "Set up a lightning-fast **Portfolio Starter Template** with Vite + React + TypeScript",
  "firebase": "Add **Google Auth + Real-time Notifications** for new job matches",
  "huggingface": "Integrate **Free NLP Models** for resume summarization and keyword extraction",

  // Quick Wins for Portfolio
  "cli": "Build a **Internship CLI Tool** – search jobs, generate cover letters, track applications from terminal",
  "chrome extension": "Develop a **Job Application Autofill Extension** – pulls data from your Supabase vault",
};

// Bonus: Helper function to get random suggestion for a skill
export function getProjectIdea(skill) {
  const ideas = projectSuggestions[skill.toLowerCase()];
  if (!ideas) return "No project ideas yet – let's brainstorm one together!";
  
  const randomIdea = Array.isArray(ideas) 
    ? ideas[Math.floor(Math.random() * ideas.length)]
    : ideas;
    
  return randomIdea;
}