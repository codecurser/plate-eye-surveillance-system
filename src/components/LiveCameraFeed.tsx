
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Camera, Wifi, WifiOff, Play, Square, AlertCircle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LiveCameraFeedProps {
  onDetection: (plateNumber: string, confidence: number, imageData?: string, cameraType?: 'entry' | 'exit') => void;
  cameraType?: 'entry' | 'exit';
  title?: string;
}

const LiveCameraFeed = ({ onDetection, cameraType = 'entry', title }: LiveCameraFeedProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectionActive, setDetectionActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [lastProcessTime, setLastProcessTime] = useState<Date | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('Ready');
  const [nextScanCountdown, setNextScanCountdown] = useState<number>(0);
  
  const { toast } = useToast();

  // Get random interval between 5-7 seconds
  const getRandomScanInterval = () => Math.floor(Math.random() * 3000) + 5000; // 5000-8000ms

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
        setProcessingStatus(`${cameraType.charAt(0).toUpperCase() + cameraType.slice(1)} Camera Active`);
        console.log(`${cameraType} camera stream started successfully`);
        
        toast({
          title: "Camera Started",
          description: `${cameraType.charAt(0).toUpperCase() + cameraType.slice(1)} camera feed is now active`,
        });
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      const errorMessage = 'Unable to access camera. Please check permissions and ensure camera is not in use by another application.';
      setError(errorMessage);
      setCameraPermission('denied');
      setProcessingStatus('Camera Error');
      
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [toast, cameraType]);

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
    setProcessingStatus('Camera Stopped');
    setNextScanCountdown(0);
    
    toast({
      title: "Camera Stopped",
      description: `${cameraType.charAt(0).toUpperCase() + cameraType.slice(1)} camera feed has been stopped`,
    });
  }, [toast, cameraType]);

  // Process frame for license plate detection
  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0) return;

    setProcessingStatus('Analyzing Frame...');
    setLastProcessTime(new Date());

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data for processing
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    try {
      console.log(`Sending frame to detection API for ${cameraType} camera...`);
      
      // Call Edge Function for plate detection
      const { data, error } = await supabase.functions.invoke('detect-license-plate', {
        body: { imageData }
      });

      if (error) {
        console.error('Detection API error:', error);
        setProcessingStatus('API Error');
        toast({
          title: "Detection Error",
          description: "Failed to process image for license plate detection",
          variant: "destructive"
        });
        return;
      }

      if (data && data.detected && data.plateNumber && data.confidence >= 95) {
        console.log(`High-confidence license plate detected on ${cameraType}: ${data.plateNumber} (${data.confidence}% confidence)`);
        
        setDetectionActive(true);
        setProcessingStatus(`Detected: ${data.plateNumber} (${data.confidence}%)`);
        
        onDetection(data.plateNumber, data.confidence, imageData, cameraType);
        
        // Log detection to system logs
        await supabase.from('system_logs').insert({
          log_type: 'detection',
          message: `High-confidence license plate detected on ${cameraType}: ${data.plateNumber}`,
          details: {
            confidence: data.confidence,
            timestamp: new Date().toISOString(),
            camera_location: `${cameraType.charAt(0).toUpperCase() + cameraType.slice(1)} Camera`,
            camera_type: cameraType
          }
        });

        toast({
          title: "High-Confidence Detection!",
          description: `${data.plateNumber} (${data.confidence}% confidence) - ${cameraType.charAt(0).toUpperCase() + cameraType.slice(1)} Camera`,
        });

        setTimeout(() => {
          setDetectionActive(false);
          setProcessingStatus('Monitoring');
        }, 3000);
      } else if (data && data.detected && data.confidence < 95) {
        console.log(`Low-confidence detection ignored: ${data.plateNumber} (${data.confidence}% confidence)`);
        setProcessingStatus(`Low Confidence: ${data.confidence}% - Ignored`);
        setTimeout(() => setProcessingStatus('Monitoring'), 2000);
      } else {
        setProcessingStatus('No High-Confidence Plate Detected');
        setTimeout(() => setProcessingStatus('Monitoring'), 1000);
      }
    } catch (err) {
      console.error('Frame processing error:', err);
      setProcessingStatus('Processing Error');
      toast({
        title: "Processing Error",
        description: "Failed to process camera frame",
        variant: "destructive"
      });
    }
  }, [isStreaming, onDetection, toast, cameraType]);

  // Start/stop processing
  const toggleProcessing = useCallback(() => {
    if (!isProcessing) {
      setProcessingStatus('Starting Detection...');
      toast({
        title: "Detection Started",
        description: `Now scanning for license plates every 5-7 seconds on ${cameraType} camera`,
      });
    } else {
      setProcessingStatus('Stopping Detection...');
      setNextScanCountdown(0);
      toast({
        title: "Detection Stopped",
        description: `License plate scanning paused on ${cameraType} camera`,
      });
    }
    setIsProcessing(!isProcessing);
  }, [isProcessing, toast, cameraType]);

  // Process frames at random intervals between 5-7 seconds
  useEffect(() => {
    if (!isProcessing || !isStreaming) return;

    let timeoutId: NodeJS.Timeout;
    let countdownId: NodeJS.Timeout;

    const scheduleNextScan = () => {
      const interval = getRandomScanInterval();
      let countdown = Math.ceil(interval / 1000);
      setNextScanCountdown(countdown);

      // Update countdown every second
      const updateCountdown = () => {
        countdown--;
        setNextScanCountdown(countdown);
        if (countdown > 0) {
          countdownId = setTimeout(updateCountdown, 1000);
        }
      };
      updateCountdown();

      timeoutId = setTimeout(() => {
        processFrame().then(() => {
          if (isProcessing && isStreaming) {
            scheduleNextScan();
          }
        });
      }, interval);
    };

    scheduleNextScan();

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(countdownId);
    };
  }, [isProcessing, isStreaming, processFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const displayTitle = title || `Live License Plate Detection - ${cameraType.charAt(0).toUpperCase() + cameraType.slice(1)} Camera`;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {displayTitle}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isStreaming ? "default" : "destructive"} className="gap-1">
              {isStreaming ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isStreaming ? 'Connected' : 'Disconnected'}
            </Badge>
            {isProcessing && (
              <Badge variant="secondary" className="gap-1">
                <Eye className="w-3 h-3" />
                Scanning
              </Badge>
            )}
            {cameraType === 'entry' && (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                Entry
              </Badge>
            )}
            {cameraType === 'exit' && (
              <Badge variant="outline" className="bg-red-50 text-red-700">
                Exit
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Camera Controls */}
          <div className="flex gap-2 flex-wrap">
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
                  disabled={!isStreaming}
                >
                  <Eye className="w-4 h-4" />
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
                  <div className="relative animate-pulse">
                    <div className="w-64 h-16 border-4 border-green-500 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-green-500 font-bold text-lg">HIGH-CONFIDENCE DETECTION!</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Stream Info */}
              {isStreaming && (
                <>
                  <div className="absolute top-4 left-4 text-xs text-white bg-black/70 px-3 py-1 rounded">
                    🔴 LIVE | {new Date().toLocaleTimeString()}
                  </div>
                  <div className="absolute bottom-4 right-4 text-xs text-white bg-black/70 px-3 py-1 rounded">
                    {processingStatus}
                  </div>
                  {nextScanCountdown > 0 && isProcessing && (
                    <div className="absolute bottom-4 left-4 text-xs text-white bg-blue-700/90 px-3 py-1 rounded">
                      Next scan in: {nextScanCountdown}s
                    </div>
                  )}
                  {lastProcessTime && (
                    <div className="absolute top-4 right-4 text-xs text-white bg-black/70 px-3 py-1 rounded">
                      Last Scan: {lastProcessTime.toLocaleTimeString()}
                    </div>
                  )}
                </>
              )}
              
              {/* No Stream Placeholder */}
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-semibold mb-2">Camera Not Active</p>
                    <p className="text-sm">Click "Start Camera" to begin license plate detection</p>
                    <p className="text-xs mt-2 text-gray-500">
                      {cameraType.charAt(0).toUpperCase() + cameraType.slice(1)} Camera - 95%+ Confidence Required
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium">{processingStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Camera Type:</span>
              <span className="font-medium capitalize">{cameraType}</span>
            </div>
          </div>

          {/* Detection Info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              <strong>High-Precision License Plate Detection:</strong>
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Scans every 5-7 seconds to avoid API rate limits</li>
              <li>• Only saves detections with 95%+ confidence</li>
              <li>• Camera type: {cameraType.charAt(0).toUpperCase() + cameraType.slice(1)}</li>
              <li>• All high-confidence detections are automatically saved</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveCameraFeed;
