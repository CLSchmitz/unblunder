import React from 'react';
import { useAppState } from '../../state/store';

export function BlunderNav() {
  const { blunders, currentBlunderIndex, goToNextBlunder, goToPreviousBlunder } = useAppState();

  if (blunders.length === 0) {
    return null;
  }

  const isFirst = currentBlunderIndex === 0;
  const isLast = currentBlunderIndex === blunders.length - 1;

  return (
    <div className="info-box">
      <div className="nav-buttons">
        <button
          className="nav-button"
          onClick={goToPreviousBlunder}
          disabled={isFirst}
        >
          &lt; Previous
        </button>
        <button
          className="nav-button"
          onClick={goToNextBlunder}
          disabled={isLast}
        >
          Next &gt;
        </button>
      </div>
      <div className="nav-position">
        {currentBlunderIndex + 1} of {blunders.length}
      </div>
    </div>
  );
}

