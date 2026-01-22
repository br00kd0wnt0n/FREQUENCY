import { useNotebookStore } from '../../stores/notebookStore';

interface NotebookPanelProps {
  onClose: () => void;
}

type TabType = 'frequencies' | 'characters' | 'signals' | 'scratchpad';

export function NotebookPanel({ onClose }: NotebookPanelProps) {
  const { entries, activeTab, setActiveTab, scratchpadContent, setScratchpadContent } = useNotebookStore();

  const tabs: { id: TabType; label: string }[] = [
    { id: 'frequencies', label: 'FREQ' },
    { id: 'characters', label: 'CONTACTS' },
    { id: 'signals', label: 'SIGNALS' },
    { id: 'scratchpad', label: 'NOTES' },
  ];

  const filteredEntries = entries.filter((entry) => {
    if (activeTab === 'frequencies') return entry.entry_type === 'frequency';
    if (activeTab === 'characters') return entry.entry_type === 'character';
    if (activeTab === 'signals') return entry.entry_type === 'signal';
    return false;
  });

  return (
    <div className="notebook-panel">
      <div className="notebook-header">
        <h2 className="notebook-title">NOTEBOOK</h2>
        <button className="notebook-close" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="notebook-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`notebook-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="notebook-content">
        {activeTab === 'scratchpad' ? (
          <textarea
            className="scratchpad-textarea"
            value={scratchpadContent}
            onChange={(e) => setScratchpadContent(e.target.value)}
            placeholder="Jot down notes, frequencies, observations..."
          />
        ) : filteredEntries.length === 0 ? (
          <div className="notebook-empty">
            {activeTab === 'frequencies' && 'No frequencies logged yet. Scan the dial to find signals.'}
            {activeTab === 'characters' && 'No contacts made yet. Find a voice on the radio.'}
            {activeTab === 'signals' && 'No signals decoded yet. Listen for morse or numbers.'}
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div key={entry.id} className="notebook-entry">
              <div className="notebook-entry-header">
                <span className="notebook-entry-title">{entry.title}</span>
                {entry.frequency_ref && (
                  <span className="notebook-entry-freq">{entry.frequency_ref.toFixed(3)} MHz</span>
                )}
              </div>
              {entry.content && (
                <div className="notebook-entry-content">{entry.content}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
