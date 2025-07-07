
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Camera, Wifi, WifiOff, Play, Square, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LiveCameraFeedProps {
  onDetection: (plateNumber: string, confidence: number, imageData?: string) => void;
}

const LiveCameraFeed = ({ onDetection }: LiveCameraFeedProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectionActive, setDetectionActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use back camera if available
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        setCameraPermission('granted');
        console.log('Camera stream started successfully');
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
      setCameraPermission('denied');
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsProcessing(false);
  }, []);

  // Process frame for license plate detection
  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data for processing
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    try {
      // Call Edge Function for plate detection
      const { data, error } = await supabase.functions.invoke('detect-license-plate', {
        body: { imageData }
      });

      if (error) {
        console.error('Detection error:', error);
        return;
      }

      if (data && data.plateNumber) {
        setDetectionActive(true);
        onDetection(data.plateNumber, data.confidence || 85, imageData);
        
        // Log detection to system logs
        await supabase.from('system_logs').insert({
          log_type: 'detection',
          message: `License plate detected: ${data.plateNumber}`,
          details: {
            confidence: data.confidence,
            timestamp: new Date().toISOString(),
            camera_location: 'Live Camera Feed'
          }
        });

        setTimeout(() => setDetectionActive(false), 2000);
      }
    } catch (err) {
      console.error('Frame processing error:', err);
    }
  }, [isStreaming, onDetection]);

  // Start/stop processing
  const toggleProcessing = useCallback(() => {
    setIsProcessing(!isProcessing);
  }, [isProcessing]);

  // Process frames at regular intervals
  useEffect(() => {
    if (!isProcessing || !isStreaming) return;

    const interval = setInterval(processFrame, 2000); // Process every 2 seconds
    return () => clearInterval(interval);
  }, [isProcessing, isStreaming, processFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Live Camera Feed
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isStreaming ? "default" : "destructive"} className="gap-1">
              {isStreaming ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isStreaming ? 'Connected' : 'Disconnected'}
            </Badge>
            {isProcessing && (
              <Badge variant="secondary" className="gap-1">
                Processing
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Camera Controls */}
          <div className="flex gap-2">
            {!isStreaming ? (
              <Button onClick={startCamera} className="gap-2">
                <Play className="w-4 h-4" />
                Start Camera
              </Button>
            ) : (
              <>
                <Button onClick={stopCamera} variant="destructive" className="gap-2">
                  <Square className="w-4 h-4" />
                  Stop Camera
                </Button>
                <Button 
                  onClick={toggleProcessing} 
                  variant={isProcessing ? "secondary" : "default"}
                  className="gap-2"
                >
                  {isProcessing ? 'Stop Detection' : 'Start Detection'}
                </Button>
              </>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Video Feed */}
          <div className="relative">
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Processing Canvas (hidden) */}
              <canvas
                ref={canvasRef}
                className="hidden"
              />
              
              {/* Detection Overlay */}
              {detectionActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div className="w-48 h-12 border-2 border-primary bg-primary/10 rounded pulse-ring"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">PLATE DETECTED</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Stream Info */}
              {isStreaming && (
                <>
                  <div className="absolute top-4 left-4 text-xs text-white bg-black/50 px-2 py-1 rounded">
                    LIVE | {new Date().toLocaleTimeString()}
                  </div>
                  <div className="absolute bottom-4 right-4 text-xs text-white bg-black/50 px-2 py-1 rounded">
                    {isProcessing ? 'Detecting...' : 'Monitoring'}
                  </div>
                </>
              )}
              
              {/* No Stream Placeholder */}
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Camera not active</p>
                    <p className="text-xs">Click "Start Camera" to begin</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Info */}
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Status: {isStreaming ? (isProcessing ? 'Processing' : 'Ready') : 'Offline'}</span>
            <span>Permission: {cameraPermission}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveCameraFeed;
