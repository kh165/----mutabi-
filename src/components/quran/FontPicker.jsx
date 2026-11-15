import React from 'react';
export function FontPicker({ fonts, selectedId, onSelect }) { return <div className="grid gap-2">{fonts.map((font) => <button type="button" key={font.id} onClick={() => onSelect(font.id)} aria-pressed={font.id === selectedId}>{font.shortName}</button>)}</div>; }
