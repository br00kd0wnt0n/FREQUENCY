import { useEffect, useState } from 'react';
import { RadioInterface } from './components/Radio/RadioInterface';
import { NotebookPanel } from './components/Notebook/NotebookPanel';
import { useSocket } from './hooks/useSocket';
import './styles/radio.css';

function App() {
  const [showNotebook, setShowNotebook] = useState(false);
  const { connect, isConnected } = useSocket();

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">FREQUENCY</h1>
        <div className="connection-status">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          {isConnected ? 'CONNECTED' : 'CONNECTING...'}
        </div>
      </header>

      <main className="app-main">
        {showNotebook ? (
          <NotebookPanel onClose={() => setShowNotebook(false)} />
        ) : (
          <RadioInterface />
        )}
      </main>

      <nav className="app-nav">
        <button
          className={`nav-button ${!showNotebook ? 'active' : ''}`}
          onClick={() => setShowNotebook(false)}
        >
          RADIO
        </button>
        <button
          className={`nav-button ${showNotebook ? 'active' : ''}`}
          onClick={() => setShowNotebook(true)}
        >
          NOTEBOOK
        </button>
      </nav>
    </div>
  );
}

export default App;
