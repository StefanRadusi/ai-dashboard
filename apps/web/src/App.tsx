import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useAssistantRuntime } from './lib/assistant';
import { AppShell } from './components/layout/AppShell';
import { SplitView } from './components/layout/SplitView';
import { ChatPanel } from './components/chat/ChatPanel';
import { Dashboard } from './components/dashboard';
import { DisplayDataToolUI } from './components/tools';
import './App.css';

function AppContent() {
  return (
    <AppShell>
      <SplitView
        left={<ChatPanel />}
        right={<Dashboard />}
      />
    </AppShell>
  );
}

function App() {
  const runtime = useAssistantRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <DisplayDataToolUI />
      <AppContent />
    </AssistantRuntimeProvider>
  );
}

export default App;
