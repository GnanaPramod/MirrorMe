// import React from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import { useAuth } from './hooks/useAuth';
// import Layout from './components/Layout/Layout';
// import Landing from './pages/Landing';
// import Login from './pages/Auth/Login';
// import Signup from './pages/Auth/Signup';
// import Dashboard from './pages/Dashboard/Dashboard';
// import LoadingSpinner from './components/UI/LoadingSpinner';

// function App() {
//   const { user, loading } = useAuth();

//   // Show loading screen immediately and keep it minimal
//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
//         <div className="text-center">
//           <LoadingSpinner size="lg" type="orb" />
//           <p className="text-white/80 mt-4 text-lg font-medium">Loading your emotional journey...</p>
//           <p className="text-white/60 mt-2 text-sm">Connecting to Mirror Me</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <Router>
//       <Layout>
//         <Routes>
//           <Route path="/" element={<Landing />} />
//           <Route 
//             path="/login" 
//             element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
//           />
//           <Route 
//             path="/signup" 
//             element={user ? <Navigate to="/dashboard" replace /> : <Signup />} 
//           />
//           <Route 
//             path="/dashboard" 
//             element={user ? <Dashboard /> : <Navigate to="/login" replace />} 
//           />
//           <Route path="*" element={<Navigate to="/" replace />} />
//         </Routes>
//       </Layout>
//     </Router>
//   );
// }

// export default App;
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout/Layout';
import Landing from './pages/Landing';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import Dashboard from './pages/Dashboard/Dashboard';
import LoadingSpinner from './components/UI/LoadingSpinner';

function App() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 1000); // 3 seconds minimum splash screen

    return () => clearTimeout(splashTimer);
  }, []);

  const shouldShowLoading = loading || showSplash;

  if (shouldShowLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" type="orb" />
          <p className="text-white/80 mt-4 text-lg font-medium">Loading your emotional journey...</p>
          <p className="text-white/60 mt-2 text-sm">Connecting to Mirror Me</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
          />
          <Route 
            path="/signup" 
            element={user ? <Navigate to="/dashboard" replace /> : <Signup />} 
          />
          <Route 
            path="/dashboard" 
            element={user ? <Dashboard /> : <Navigate to="/login" replace />} 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
