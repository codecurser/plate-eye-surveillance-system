
import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LiveCameraFeed from '@/components/LiveCameraFeed';
import DetectionResults from '@/components/DetectionResults';
import VehicleLog from '@/components/VehicleLog';
import SystemStats from '@/components/SystemStats';
import { Eye, Settings, Download, AlertTriangle, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Detection {
  id: string;
  plateNumber: string;
  timestamp: Date;
  confidence: number;
  location: string;
  cameraType?: 'entry' | 'exit';
}

const Index = () => {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [systemAlert, setSystemAlert] = useState(false);
  const [isLoadingDetections, setIsLoadingDetections] = useState(true);
  const { toast } = useToast();

  // Load existing detections from database
  const loadDetections = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_detections')
        .select('*')
        .order('detection_timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error loading detections:', error);
        toast({
          title: "Database Error",
          description: "Failed to load existing detections",
          variant: "destructive"
        });
        return;
      }

      const formattedDetections = data.map(detection => ({
        id: detection.id,
        plateNumber: detection.plate_number,
        timestamp: new Date(detection.detection_timestamp || detection.created_at),
        confidence: detection.confidence_score || 0,
        location: detection.camera_location || 'Unknown Camera',
        cameraType: (detection.camera_location?.toLowerCase().includes('exit') ? 'exit' : 'entry') as 'entry' | 'exit'
      }));

      setDetections(formattedDetections);
    } catch (err) {
      console.error('Error loading detections:', err);
    } finally {
      setIsLoadingDetections(false);
    }
  }, [toast]);

  // Handle new detection from camera
  const handleNewDetection = useCallback(async (plateNumber: string, confidence: number, imageData?: string, cameraType: 'entry' | 'exit' = 'entry') => {
    try {
      const cameraLocation = `${cameraType.charAt(0).toUpperCase() + cameraType.slice(1)} Camera`;
      
      // Save to database
      const { data, error } = await supabase
        .from('vehicle_detections')
        .insert({
          plate_number: plateNumber,
          confidence_score: confidence,
          camera_location: cameraLocation,
          image_url: imageData, // Store base64 image data
          status: 'detected',
          vehicle_type: 'vehicle' // Default type
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving detection:', error);
        toast({
          title: "Save Error",
          description: "Failed to save detection to database",
          variant: "destructive"
        });
        return;
      }

      // Add to local state
      const newDetection: Detection = {
        id: data.id,
        plateNumber: plateNumber,
        timestamp: new Date(),
        confidence: confidence,
        location: cameraLocation,
        cameraType: cameraType
      };
      
      setDetections(prev => [newDetection, ...prev].slice(0, 100));
      
      toast({
        title: `Vehicle ${cameraType === 'entry' ? 'Entered' : 'Exited'}`,
        description: `License plate: ${plateNumber} (${confidence}% confidence)`,
      });

      console.log(`New vehicle detected and saved - ${cameraType.toUpperCase()}:`, plateNumber);
    } catch (err) {
      console.error('Error handling detection:', err);
      toast({
        title: "Detection Error",
        description: "Failed to process detection",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Export detections data
  const handleExportData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_detections')
        .select('*')
        .order('detection_timestamp', { ascending: false });

      if (error) {
        toast({
          title: "Export Error",
          description: "Failed to fetch data for export",
          variant: "destructive"
        });
        return;
      }

      // Convert to CSV
      const csvContent = [
        'Plate Number,Confidence,Detection Time,Camera Location,Status,Vehicle Type',
        ...data.map(d => 
          `${d.plate_number},${d.confidence_score}%,${new Date(d.detection_timestamp || d.created_at).toLocaleString()},${d.camera_location},${d.status},${d.vehicle_type || 'vehicle'}`
        )
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vehicle-detections-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Vehicle detection data exported successfully",
      });
    } catch (err) {
      console.error('Export error:', err);
      toast({
        title: "Export Failed",
        description: "Failed to export data",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Load detections on component mount
  useEffect(() => {
    loadDetections();
  }, [loadDetections]);

  // Set up real-time subscriptions for new detections
  useEffect(() => {
    const channel = supabase
      .channel('vehicle-detections')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vehicle_detections'
        },
        (payload) => {
          console.log('Real-time detection received:', payload);
          // Handle real-time updates if needed
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
                  <p className="text-sm text-muted-foreground">High-Precision License Plate Recognition System</p>
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
              
              <Button variant="outline" size="sm" className="gap-2" onClick={handleExportData}>
                <Download className="w-4 h-4" />
                Export Data
              </Button>
              
              <Button variant="outline" size="sm" className="gap-2">
                <Database className="w-4 h-4" />
                {isLoadingDetections ? 'Loading...' : `${detections.length} Records`}
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
        <div className="space-y-6">
          {/* Camera Feeds - Entry and Exit */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LiveCameraFeed 
              onDetection={handleNewDetection} 
              cameraType="entry"
              title="Entry Gate - License Plate Detection"
            />
            <LiveCameraFeed 
              onDetection={handleNewDetection} 
              cameraType="exit"
              title="Exit Gate - License Plate Detection"
            />
          </div>
          
          {/* Detection Results and Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DetectionResults detections={detections} />
            </div>
            <div>
              <SystemStats detections={detections} />
            </div>
          </div>
          
          {/* Vehicle Log */}
          <div>
            <VehicleLog detections={detections} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
