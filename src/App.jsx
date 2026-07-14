import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { GameProvider } from '@/lib/GameContext';

import HomeScreen from '@/pages/HomeScreen';
import CharacterSelect from '@/pages/CharacterSelect';
import CharacterConfirm from '@/pages/CharacterConfirm';
import GameScreen from '@/pages/GameScreen';
import SummaryScreen from '@/pages/SummaryScreen';
import AdminPanel from '@/pages/AdminPanel';
import IntroNarration from '@/pages/IntroNarration';
import RunHistory from '@/pages/RunHistory';
import StoryJournal from '@/pages/StoryJournal';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <GameProvider>
      <Routes>
        {/* APP ENTRY LOCK: Direct to Home. NO global intro/splash. Narration only in-game. */}
        <Route path="/" element={<HomeScreen />} />
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/select" element={<CharacterSelect />} />
        <Route path="/confirm" element={<CharacterConfirm />} />
        <Route path="/intro" element={<IntroNarration />} />
        <Route path="/game" element={<GameScreen />} />
        <Route path="/summary" element={<SummaryScreen />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/history" element={<RunHistory />} />
        <Route path="/journal" element={<StoryJournal />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </GameProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App