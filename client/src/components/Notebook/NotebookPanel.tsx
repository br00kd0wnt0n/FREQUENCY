import { useNotebookStore } from '../../stores/notebookStore';

interface NotebookPanelProps {
  onClose?: () => void;
}

export function NotebookPanel({ onClose }: NotebookPanelProps) {
  const { entries, scratchpadContent, setScratchpadContent } = useNotebookStore();

  // Filter entries by type
  const noteEntries = entries.filter(e => e.entry_type === 'note');
  const frequencyEntries = entries.filter(e => e.entry_type === 'frequency');
  const characterEntries = entries.filter(e => e.entry_type === 'character');
  const signalEntries = entries.filter(e => e.entry_type === 'signal');

  const renderEntries = (items: typeof entries, emptyMessage: string) => {
    if (items.length === 0) {
      return <div className="quadrant-empty">{emptyMessage}</div>;
    }
    return items.map((entry) => (
      <div key={entry.id} className={`notebook-entry ${entry.is_pinned ? 'pinned' : ''}`}>
        <div className="notebook-entry-header">
          <span className="notebook-entry-title">
            {entry.is_pinned && '📌 '}{entry.title}
          </span>
          {entry.frequency_ref && (
            <span className="notebook-entry-freq">{entry.frequency_ref.toFixed(3)} MHz</span>
          )}
        </div>
        {entry.content && (
          <div className="notebook-entry-content">{entry.content}</div>
        )}
      </div>
    ));
  };

  return (
    <div className="notebook-panel">
      <div className="notebook-header">
        <h2 className="notebook-title">NOTEBOOK</h2>
        {onClose && (
          <button className="notebook-close" onClick={onClose}>
            ×
          </button>
        )}
      </div>

      <div className="notebook-quadrants">
        {/* Top Left - Notes/Leads */}
        <div className="notebook-quadrant notes">
          <div className="quadrant-header">NOTES & LEADS</div>
          <div className="quadrant-content">
            {renderEntries(noteEntries, 'No notes yet...')}
            <textarea
              className="scratchpad-textarea"
              value={scratchpadContent}
              onChange={(e) => setScratchpadContent(e.target.value)}
              placeholder="Jot down notes..."
            />
          </div>
        </div>

        {/* Top Right - Frequencies */}
        <div className="notebook-quadrant frequencies">
          <div className="quadrant-header">FREQUENCIES</div>
          <div className="quadrant-content">
            {renderEntries(frequencyEntries, 'Scan the dial to find signals...')}
          </div>
        </div>

        {/* Bottom Left - Contacts */}
        <div className="notebook-quadrant contacts">
          <div className="quadrant-header">CONTACTS</div>
          <div className="quadrant-content">
            {renderEntries(characterEntries, 'Find a voice on the radio...')}
          </div>
        </div>

        {/* Bottom Right - Signals */}
        <div className="notebook-quadrant signals">
          <div className="quadrant-header">SIGNALS</div>
          <div className="quadrant-content">
            {renderEntries(signalEntries, 'Listen for morse or numbers...')}
          </div>
        </div>
      </div>
    </div>
  );
}
