import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { RequireProfile } from './components/RequireProfile';
import { Chat } from './features/Chat';
import { Diagnosis } from './features/Diagnosis';
import { Home } from './features/Home';
import { More } from './features/More';
import { Onboarding } from './features/Onboarding';
import { Project } from './features/Project';
import { Schedule } from './features/Schedule';

export default function App() {
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route
        element={
          <RequireProfile>
            <AppShell />
          </RequireProfile>
        }
      >
        <Route path="/inicio" element={<Home />} />
        <Route path="/projeto" element={<Project />} />
        <Route path="/cronograma" element={<Schedule />} />
        <Route path="/diagnostico" element={<Diagnosis />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/mais" element={<More />} />
        <Route index element={<Navigate to="/inicio" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
