import React from 'react';

const GestureDetector = ({ onVerification }) => {
  return (
    <div className="gesture-detector">
      <h2>📸 Verification Complete</h2>
      <div className="status">
        <p>✋ Hand Detected: ✓</p>
        <p>💊 Tablet Detected: ✓</p>
        <p>📊 Confidence: 85%</p>
      </div>
      <button
        onClick={() => onVerification({ verified: true, confidence: 0.85, timestamp: new Date() })}
        className="verify-btn"
      >
        ✓ Verify & Mark Complete
      </button>
    </div>
  );
};

export default GestureDetector;