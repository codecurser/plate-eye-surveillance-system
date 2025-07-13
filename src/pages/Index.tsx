
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
  fareAmount?: number;
  durationHours?: number;
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
        cameraType: (detection.camera_location?.toLowerCase().includes('exit') ? 'exit' : 'entry') as 'entry' | 'exit',
        fareAmount: detection.fare_amount || undefined,
        durationHours: detection.duration_hours || undefined
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
      
      console.log(`Processing ${cameraType} detection for plate: ${plateNumber}`);

      if (cameraType === 'entry') {
        // Handle entry detection - just save the entry record
        const { data, error } = await supabase
          .from('vehicle_detections')
          .insert({
            plate_number: plateNumber,
            confidence_score: confidence,
            camera_location: cameraLocation,
            image_url: imageData,
            status: 'detected',
            vehicle_type: 'vehicle',
            entry_time: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('Error saving entry detection:', error);
          toast({
            title: "Save Error",
            description: "Failed to save entry detection to database",
            variant: "destructive"
          });
          return;
        }

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
          title: "Vehicle Entered",
          description: `License plate: ${plateNumber} - Entry recorded`,
        });

      } else if (cameraType === 'exit') {
        // Handle exit detection - find matching entry and calculate fare
        console.log(`Looking for entry record for plate: ${plateNumber}`);
        
        // Find the most recent entry for this plate number that doesn't have an exit time
        const { data: entryRecords, error: entryError } = await supabase
          .from('vehicle_detections')
          .select('*')
          .eq('plate_number', plateNumber)
          .is('exit_time', null)
          .not('entry_time', 'is', null)
          .order('entry_time', { ascending: false })
          .limit(1);

        if (entryError) {
          console.error('Error finding entry record:', entryError);
          toast({
            title: "Error",
            description: "Failed to find entry record for vehicle",
            variant: "destructive"
          });
          return;
        }

        if (!entryRecords || entryRecords.length === 0) {
          console.log('No entry record found, creating exit-only record');
          // No entry found, create exit-only record
          const { data, error } = await supabase
            .from('vehicle_detections')
            .insert({
              plate_number: plateNumber,
              confidence_score: confidence,
              camera_location: cameraLocation,
              image_url: imageData,
              status: 'detected',
              vehicle_type: 'vehicle',
              exit_time: new Date().toISOString()
            })
            .select()
            .single();

          if (error) {
            console.error('Error saving exit-only detection:', error);
            return;
          }

          toast({
            title: "Vehicle Exited",
            description: `License plate: ${plateNumber} - No entry record found`,
            variant: "destructive"
          });
          return;
        }

        const entryRecord = entryRecords[0];
        const entryTime = new Date(entryRecord.entry_time);
        const exitTime = new Date();

        console.log(`Found entry record from: ${entryTime.toISOString()}`);
        console.log(`Exit time: ${exitTime.toISOString()}`);

        // Get current fare rates
        const { data: fareRates, error: fareError } = await supabase
          .from('fare_rates')
          .select('*')
          .eq('is_active', true)
          .limit(1)
          .single();

        if (fareError) {
          console.error('Error fetching fare rates:', fareError);
        }

        const hourlyRate = fareRates?.hourly_rate || 10.00;
        const minimumCharge = fareRates?.minimum_charge || 5.00;
        const gracePeriod = fareRates?.grace_period_minutes || 15;

        // Calculate fare using the database function
        const { data: fareCalculation, error: fareCalcError } = await supabase
          .rpc('calculate_vehicle_fare', {
            entry_timestamp: entryTime.toISOString(),
            exit_timestamp: exitTime.toISOString(),
            rate_per_hour: hourlyRate,
            minimum_charge: minimumCharge,
            grace_minutes: gracePeriod
          });

        if (fareCalcError) {
          console.error('Error calculating fare:', fareCalcError);
          toast({
            title: "Calculation Error",
            description: "Failed to calculate parking fare",
            variant: "destructive"
          });
          return;
        }

        const calculatedFare = fareCalculation?.[0];
        const durationHours = calculatedFare?.duration_hours || 0;
        const fareAmount = calculatedFare?.fare_amount || minimumCharge;

        console.log(`Calculated fare: $${fareAmount} for ${durationHours} hours`);

        // Update the entry record with exit information and fare
        const { data: updatedRecord, error: updateError } = await supabase
          .from('vehicle_detections')
          .update({
            exit_time: exitTime.toISOString(),
            duration_hours: durationHours,
            fare_amount: fareAmount,
            hourly_rate: hourlyRate,
            status: 'completed'
          })
          .eq('id', entryRecord.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating exit record:', updateError);
          toast({
            title: "Update Error",
            description: "Failed to update exit information",
            variant: "destructive"
          });
          return;
        }

        // Create a new exit detection record for the log
        const { data: exitRecord, error: exitError } = await supabase
          .from('vehicle_detections')
          .insert({
            plate_number: plateNumber,
            confidence_score: confidence,
            camera_location: cameraLocation,
            image_url: imageData,
            status: 'exit',
            vehicle_type: 'vehicle',
            exit_time: exitTime.toISOString(),
            entry_time: entryTime.toISOString(),
            duration_hours: durationHours,
            fare_amount: fareAmount,
            hourly_rate: hourlyRate
          })
          .select()
          .single();

        // Add to local state
        const exitDetection: Detection = {
          id: exitRecord?.id || Date.now().toString(),
          plateNumber: plateNumber,
          timestamp: exitTime,
          confidence: confidence,
          location: cameraLocation,
          cameraType: cameraType,
          fareAmount: Number(fareAmount),
          durationHours: Number(durationHours)
        };
        
        setDetections(prev => [exitDetection, ...prev].slice(0, 100));
        
        // Log the fare calculation
        await supabase.from('system_logs').insert({
          log_type: 'info',
          message: `Fare calculated for vehicle ${plateNumber}`,
          details: {
            plate_number: plateNumber,
            entry_time: entryTime.toISOString(),
            exit_time: exitTime.toISOString(),
            duration_hours: durationHours,
            fare_amount: fareAmount,
            hourly_rate: hourlyRate
          }
        });

        toast({
          title: "Vehicle Exited - Fare Calculated",
          description: `${plateNumber}: $${Number(fareAmount).toFixed(2)} (${Number(durationHours).toFixed(1)}h)`,
        });
      }

      console.log(`Detection processed successfully for ${cameraType}: ${plateNumber}`);
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
        'Plate Number,Confidence,Detection Time,Camera Location,Status,Entry Time,Exit Time,Duration Hours,Fare Amount,Hourly Rate',
        ...data.map(d => 
          `${d.plate_number},${d.confidence_score}%,${new Date(d.detection_timestamp || d.created_at).toLocaleString()},${d.camera_location},${d.status},${d.entry_time ? new Date(d.entry_time).toLocaleString() : ''},${d.exit_time ? new Date(d.exit_time).toLocaleString() : ''},${d.duration_hours || ''},${d.fare_amount || ''},${d.hourly_rate || ''}`
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
        description: "Vehicle detection data with fares exported successfully",
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
          // Reload detections to get the latest data
          loadDetections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDetections]);

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
                  <p className="text-sm text-muted-foreground">High-Precision License Plate Recognition with Automated Fare Calculation</p>
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
              title="Exit Gate - License Plate Detection & Fare Calculation"
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
