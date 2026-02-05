import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "./services/supabaseClient";

// Components
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

// Pages
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/StudentDashboard";
import StudentApplications from "./pages/StudentApplications";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import ResumeHistory from "./pages/ResumeHistory";
import ResumeFixerPage from "./pages/ResumeFixerPage";
import RecruiterJobPost from "./pages/RecruiterJobPost";
import StudentJobBoard from "./pages/StudentJobBoard";
import MyProjects from "./pages/MyProjects"; 
import Messages from "./pages/Messages";

// 🔥 IMPORT THE PAYMENT SUCCESS PAGE
import PaymentSuccess from "./pages/PaymentSuccess";

// --- SECURITY HELPERS ---

// 櫨 Loader Component with Safety Timeout
const AppLoader = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 z-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
    <p className="text-slate-400 text-sm font-semibold animate-pulse">Loading InternAI...</p>
  </div>
);

function RoleGuard({ children, allowedRole }) {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function checkRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (mounted) {
           // Default to student if role is missing
           setUserRole(user?.user_metadata?.user_role || "student");
        }
      } catch (err) {
        console.error("Role Check Error:", err);
        if (mounted) setUserRole("student"); // Fallback
      } finally {
        if (mounted) setLoading(false);
      }
    }
    checkRole();
    return () => { mounted = false; };
  }, []);

  if (loading) return <AppLoader />;

  if (userRole !== allowedRole) {
    return <Navigate to={userRole === "recruiter" ? "/recruiter" : "/student"} replace />;
  }
  return children;
}

function RoleRedirector() {
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function getPath() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const role = user?.user_metadata?.user_role || "student";
        if (mounted) setPath(role === "recruiter" ? "/recruiter" : "/student");
      } catch (err) {
        if (mounted) setPath("/auth");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    getPath();
    return () => { mounted = false; };
  }, []);

  if (loading) return <AppLoader />;
  
  return <Navigate to={path} replace />;
}

// --- MAIN APP COMPONENT ---

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        {/* =======================================================
            柏 PUBLIC & AUTH ROUTES
           ======================================================= */}
        <Route path="/auth" element={<Auth />} />
        
        {/* Route /pricing to auth or a dedicated pricing page if you have one */}
        <Route path="/pricing" element={<Auth />} />

        {/* 🔥 PAYMENT SUCCESS ROUTE (CORRECTED)
            We wrap in ProtectedRoute to ensure they have a session, 
            but we DO NOT wrap in RoleGuard to prevent redirect loops.
            Now points to PaymentSuccess instead of Auth.
        */}
        <Route 
          path="/payment/success" 
          element={
            <ProtectedRoute>
              <PaymentSuccess />
            </ProtectedRoute>
          } 
        />

        {/* Root Redirects */}
        <Route path="/" element={<ProtectedRoute><RoleRedirector /></ProtectedRoute>} />

        {/* =======================================================
            雌 STUDENT ROUTES
           ======================================================= */}
        
        <Route
          path="/student"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRole="student">
                <StudentDashboard /> 
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student-applications"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRole="student">
                <StudentApplications />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student-jobs"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRole="student">
                <StudentJobBoard />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/resume-fixer"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRole="student">
                <ResumeFixerPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/resume-history"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRole="student">
                <ResumeHistory />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-projects"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRole="student">
                <MyProjects />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        {/* =======================================================
            藻 RECRUITER ROUTES
           ======================================================= */}

        <Route
          path="/recruiter"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRole="recruiter">
                <RecruiterDashboard />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter-post"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRole="recruiter">
                <RecruiterJobPost />
              </RoleGuard>
            </ProtectedRoute>
          }
        />
<Route path="/payment/success" element={<PaymentSuccess />} />
        {/* =======================================================
            町 SHARED ROUTES
           ======================================================= */}
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}