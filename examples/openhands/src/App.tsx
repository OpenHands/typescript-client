import { Routes, Route } from 'react-router-dom';
import { ClientProvider } from '#/context';
import { RootLayout } from '#/components/layout';
import { HomePage, ConversationPage } from '#/pages';

function App() {
  return (
    <ClientProvider>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/conversations/:conversationId" element={<ConversationPage />} />
        </Route>
      </Routes>
    </ClientProvider>
  );
}

export default App;
