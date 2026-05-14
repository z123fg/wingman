import { useState } from 'react';

interface Props {
  onCreate: (name: string) => void;
  disabled?: boolean;
}

export function SessionCreator({ onCreate, disabled }: Props) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onCreate(trimmed);
      setName('');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
      <input
        type="text"
        placeholder="Session name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={disabled}
        style={{ flex: 1, padding: '6px 10px', fontSize: 14 }}
      />
      <button type="submit" disabled={disabled || !name.trim()}>
        Create session
      </button>
    </form>
  );
}
