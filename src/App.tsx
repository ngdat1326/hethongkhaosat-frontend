import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SurveyProvider } from './contexts/SurveyContext';
import { AuthProvider } from './contexts/AuthContext';
import PatientSurvey from './components/PatientSurvey';
import AdminDashboard from './components/AdminDashboard';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <SurveyProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/survey" element={<PatientSurvey />} />
              <Route path="/survey/:surveyId" element={<PatientSurvey />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin/*" element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </Router>
      </SurveyProvider>
    </AuthProvider>
  );
}

export default App;