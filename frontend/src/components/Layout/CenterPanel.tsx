import React from 'react';
import { BlunderBoard } from '../ChessBoard/BlunderBoard';
import { BlunderNav } from '../Navigation/BlunderNav';

export function CenterPanel() {
  return (
    <div className="center-panel">
      <div className="center-panel-content">
        <BlunderBoard />
        <BlunderNav />
      </div>
    </div>
  );
}

