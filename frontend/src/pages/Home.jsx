import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-73px)] bg-white">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wide text-blue-600 uppercase bg-blue-50 rounded-full">
          Powered by Advanced AI
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-gray-900 mb-6">
          Hire Smarter with <span className="text-blue-600">InternAI</span>
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-gray-600 mb-10 leading-relaxed">
          The all-in-one platform for students to find their perfect fit and recruiters 
          to identify top talent using automated resume matching and job verification.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/student"
            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all hover:-translate-y-1"
          >
            I'm a Student
          </Link>
          <Link
            to="/recruiter"
            className="px-8 py-4 bg-white text-gray-900 border-2 border-gray-100 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all hover:-translate-y-1"
          >
            I'm a Recruiter
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6 text-2xl">
                🔍
              </div>
              <h3 className="text-xl font-bold mb-3">Authenticity Check</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Our AI analyzes job descriptions to detect potential scams or "ghost" jobs, 
                giving you a Trust Score before you apply.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-6 text-2xl">
                🎯
              </div>
              <h3 className="text-xl font-bold mb-3">Resume Matching</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Instant percentage-based matching between your resume and job requirements 
                to see exactly how you stack up.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6 text-2xl">
                ⚡
              </div>
              <h3 className="text-xl font-bold mb-3">Skill Gap Analysis</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Get a clear list of missing skills and keywords you need to add to your 
                profile to land the interview.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Branding */}
      <footer className="py-12 text-center text-gray-400 text-sm">
        <p>© 2025 InternAI Intelligence Platform. Built for the future of work.</p>
      </footer>
    </div>
  );
}