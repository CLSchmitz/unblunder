import React from 'react';
import { MoveInfoBox } from '../MoveInfo/MoveInfoBox';
import { OutcomeBox } from '../OutcomeSelector/OutcomeBox';
import { BlunderNav } from '../Navigation/BlunderNav';

export function RightPanel() {
  return (
    <div className="right-panel">
      <MoveInfoBox />
      <OutcomeBox />
      <BlunderNav />
    </div>
  );
}

