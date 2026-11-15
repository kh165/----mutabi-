import React from 'react';
export function AyahText({ ayah, className = '', children }) { return <span id={`ayah-${ayah.number}`} data-page-number={ayah.pageNumber} className={className}>{children ?? ayah.text}</span>; }
