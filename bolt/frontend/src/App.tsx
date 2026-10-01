import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navigation } from './components/Navigation';
import { Home } from './pages/Home';
import { HowItWorks } from './pages/HowItWorks';
import { AuthPage } from './pages/AuthPage';
import { ReportViolation } from './pages/ReportViolation';
import { MyReports } from './pages/MyReports';
import { Profile } from './pages/Profile';
import { AuthorityDashboard } from './pages/AuthorityDashboard';
import { AllReports } from './pages/AllReports';
import { ReportDetail } from './pages/ReportDetail';
import { Analytics } from './pages/Analytics';
import { ToastViewport } from './components/ToastViewport';
import { CommandPalette } from './components/CommandPalette';

function AppContent() {
  const { isLoggedIn, user } = useApp();
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setQuickActionsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleNavigate = (page: string, reportId?: string) => {
    const protectedPages = new Set(['report', 'my-reports', 'dashboard', 'all-reports', 'analytics', 'profile', 'report-detail']);
    if (!isLoggedIn && protectedPages.has(page)) {
      setCurrentPage('register');
    } else {
      setCurrentPage(page);
    }
    if (reportId) {
      setSelectedReportId(reportId);
    }
  };

  const renderPage = () => {
    if (currentPage === 'how-it-works') {
      return <HowItWorks />;
    }

    if (!isLoggedIn) {
      switch (currentPage) {
        case 'login':
          return <AuthPage onNavigate={handleNavigate} defaultMode="login" />;
        case 'register':
          return <AuthPage onNavigate={handleNavigate} defaultMode="register" />;
        default:
          return <Home onNavigate={handleNavigate} />;
      }
    }

    if (user?.role === 'citizen') {
      switch (currentPage) {
        case 'report':
          return <ReportViolation onNavigate={handleNavigate} />;
        case 'my-reports':
          return <MyReports onNavigate={handleNavigate} />;
        case 'report-detail':
          return selectedReportId ? (
            <ReportDetail reportId={selectedReportId} onNavigate={handleNavigate} />
          ) : (
            <MyReports onNavigate={handleNavigate} />
          );
        case 'profile':
          return <Profile />;
        default:
          return <Home onNavigate={handleNavigate} />;
      }
    }

    if (user?.role === 'authority') {
      switch (currentPage) {
        case 'home':
          return <Home onNavigate={handleNavigate} />;
        case 'dashboard':
          return <AuthorityDashboard onNavigate={handleNavigate} />;
        case 'all-reports':
          return <AllReports onNavigate={handleNavigate} />;
        case 'report-detail':
          return selectedReportId ? (
            <ReportDetail reportId={selectedReportId} onNavigate={handleNavigate} />
          ) : (
            <AllReports onNavigate={handleNavigate} />
          );
        case 'analytics':
          return <Analytics />;
        case 'profile':
          return <Profile />;
        default:
          return <AuthorityDashboard onNavigate={handleNavigate} />;
      }
    }

    return <Home onNavigate={handleNavigate} />;
  };

  const isAuthPage = ['login', 'register', 'auth'].includes(currentPage);

  return (
    <div className="app-shell">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 bg-white text-slate-900 px-3 py-2 rounded-lg border border-slate-200">
        Skip to content
      </a>
      <Navigation
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenQuickActions={() => setQuickActionsOpen(true)}
        isAuthPage={isAuthPage}
      />
      <main id="main-content">
        <div key={currentPage} className="route-transition">
          {renderPage()}
        </div>
      </main>
      <CommandPalette open={quickActionsOpen} onClose={() => setQuickActionsOpen(false)} onNavigate={handleNavigate} />
      <ToastViewport />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
