
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Wifi, WifiOff } from 'lucide-react';

const CameraFeed = ({ onDetection }: { onDetection: (plateNumber: string) => void }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [detectionActive, setDetectionActive] = useState(false);

  // Simulate random license plate detections
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.3) { // 30% chance every 3 seconds
        const plateNumbers = ['ABC-1234', 'XYZ-5678', 'DEF-9012', 'GHI-3456', 'JKL-7890'];
        const randomPlate = plateNumbers[Math.floor(Math.random() * plateNumbers.length)];
        setDetectionActive(true);
        onDetection(randomPlate);
        
        setTimeout(() => setDetectionActive(false), 2000);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [onDetection]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Live Camera Feed
          </div>
          <Badge variant={isConnected ? "default" : "destructive"} className="gap-1">
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden camera-grid relative">
            {/* Simulated camera feed */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
              <div className="absolute top-4 left-4 text-xs text-gray-400 font-mono">
                CAM-01 | 1920x1080 | 30fps
              </div>
              <div className="absolute bottom-4 right-4 text-xs text-gray-400 font-mono">
                {new Date().toLocaleTimeString()}
              </div>
              
              {/* Detection overlay */}
              {detectionActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div className="w-48 h-12 border-2 border-primary bg-primary/10 rounded pulse-ring"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">VEHICLE DETECTED</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Crosshair overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-8 bg-primary/30"></div>
                <div className="absolute w-8 h-1 bg-primary/30"></div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
            <span>Resolution: 1920x1080</span>
            <span>Status: {detectionActive ? 'Detecting...' : 'Monitoring'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CameraFeed;
