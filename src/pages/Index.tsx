
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CameraFeed from '@/components/CameraFeed';
import DetectionResults from '@/components/DetectionResults';
import VehicleLog from '@/components/VehicleLog';
import SystemStats from '@/components/SystemStats';
import { Eye, Settings, Download, AlertTriangle } from 'lucide-react';

interface Detection {
  id: string;
  plateNumber: string;
  timestamp: Date;
  confidence: number;
  location: string;
}

const Index = () => {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [systemAlert, setSystemAlert] = useState(false);

  const handleNewDetection = useCallback((plateNumber: string) => {
    const newDetection: Detection = {
      id: Date.now().toString(),
      plateNumber,
      timestamp: new Date(),
      confidence: Math.floor(Math.random() * 20) + 80, // 80-99% confidence
      location: 'Main Gate - Camera 01'
    };
    
    setDetections(prev => [newDetection, ...prev].slice(0, 50)); // Keep last 50 detections
    console.log('New vehicle detected:', plateNumber);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Eye className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">PlateEye Surveillance</h1>
                  <p className="text-sm text-muted-foreground">Real-time License Plate Recognition System</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {systemAlert && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  System Alert
                </Badge>
              )}
              
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Export Data
              </Button>
              
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
          {/* Camera Feed - Takes up 2 columns on large screens */}
          <div className="lg:col-span-2">
            <CameraFeed onDetection={handleNewDetection} />
          </div>
          
          {/* Detection Results */}
          <div className="space-y-6">
            <DetectionResults detections={detections} />
            <SystemStats detections={detections} />
          </div>
          
          {/* Vehicle Log - Full width on small screens, spans all columns on large */}
          <div className="lg:col-span-3">
            <VehicleLog detections={detections} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
