import React, { useRef, useEffect, useState } from 'react';
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Camera } from '@mediapipe/camera_utils';

const GestureDetector = ({ onVerification }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [handDetected, setHandDetected] = useState(false);
  const [objectDetected, setObjectDetected] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [loading, setLoading] = useState(true);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);

  const checkHoldingGesture = useCallback((landmarks) => {
    try {
      const palmCenter = landmarks[9];
      const fingerTips = [
        landmarks[4], landmarks[8], landmarks[12], 
        landmarks[16], landmarks[20]
      ];

      const fingersCurled = fingerTips.every(tip => {
        const distance = Math.hypot(
          tip.x - palmCenter.x, 
          tip.y - palmCenter.y
        );
        return distance < 0.15;
      });

      return fingersCurled;
    } catch (error) {
      console.error('Gesture check error:', error);
      return false;
    }
  }, []);

  const onResults = useCallback((results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (results.image) {
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      }

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        setHandDetected(true);

        results.multiHandLandmarks.forEach((landmarks) => {
          try {
            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
              color: '#00FF00',
              lineWidth: 2
            });
            drawLandmarks(ctx, landmarks, {
              color: '#FF0000',
              lineWidth: 1
            });

            const isHolding = checkHoldingGesture(landmarks);
            setObjectDetected(isHolding);
            setConfidence(isHolding ? 0.85 : 0.3);

            if (isHolding) {
              ctx.fillStyle = 'green';
              ctx.font = '20px Arial';
              ctx.fillText('✓ Tablet detected in hand!', 20, 40);
            }
          } catch (error) {
            console.error('Drawing error:', error);
          }
        });
      } else {
        setHandDetected(false);
        setObjectDetected(false);
        setConfidence(0);
      }
    } catch (error) {
      console.error('Results processing error:', error);
    }
  }, [checkHoldingGesture]);

  useEffect(() => {
    let isMounted = true;

    const initializeMediaPipe = async () => {
      try {
        const hands = new Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        handsRef.current = hands;

        const startWebcam = async () => {
          if (!videoRef.current) return;
          
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { width: 640, height: 480 }
            });
            
            if (videoRef.current && isMounted) {
              videoRef.current.srcObject = stream;
            }
          } catch (error) {
            console.error('Camera access error:', error);
            alert('Please allow camera access to use gesture verification');
          }
        };

        await startWebcam();
        
        hands.onResults(onResults);

        if (videoRef.current && isMounted) {
          const camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && isMounted && handsRef.current) {
                try {
                  await handsRef.current.send({ image: videoRef.current });
                } catch (error) {
                  console.error('MediaPipe processing error:', error);
                }
              }
            },
            width: 640,
            height: 480
          });

          camera.start();
          cameraRef.current = camera;
          setLoading(false);
        }
      } catch (error) {
        console.error('MediaPipe initialization error:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeMediaPipe();

    return () => {
      isMounted = false;
      if (cameraRef.current) {
        try {
          cameraRef.current.stop();
        } catch (e) {
          console.error('Camera stop error:', e);
        }
      }
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [onResults]);

  const handleVerify = () => {
    if (objectDetected && confidence > 0.8) {
      onVerification({
        verified: true,
        confidence: confidence,
        timestamp: new Date()
      });
    } else {
      alert('Please hold the tablet closer to the camera with fingers curled');
    }
  };

  return (
    <div className="gesture-detector">
      <h2>📸 Hold up your tablet!</h2>
      
      {loading && <p>Initializing camera...</p>}
      
      <video 
        ref={videoRef} 
        style={{ display: 'none' }} 
        autoPlay
        playsInline
      />
      
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{ 
          border: '2px solid #ccc', 
          borderRadius: '8px',
          maxWidth: '100%'
        }}
      />

      <div className="status">
        <p>✋ Hand Detected: {handDetected ? '✓' : '✗'}</p>
        <p>💊 Tablet Detected: {objectDetected ? '✓' : '✗'}</p>
        <p>📊 Confidence: {(confidence * 100).toFixed(0)}%</p>
      </div>

      <button
        onClick={handleVerify}
        disabled={!objectDetected || confidence < 0.8 || loading}
        className="verify-btn"
      >
        {loading ? '⏳ Loading...' : 
         objectDetected ? '✓ Verify & Mark Complete' : 
         '⏳ Waiting for tablet...'}
      </button>
    </div>
  );
};

export default GestureDetector;