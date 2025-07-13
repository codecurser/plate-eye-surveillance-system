
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

      if (!data) {
        console.log('No detection data found');
        setDetections([]);
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
      toast({
        title: "Load Error",
        description: "Failed to load vehicle detections",
        variant: "destructive"
      });
    } finally {
      setIsLoadingDetections(false);
    }
  }, [toast]);

  // Get active fare rates with proper error handling
  const getFareRates = useCallback(async () => {
    try {
      const { data: fareRates, error } = await supabase
        .from('fare_rates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching fare rates:', error);
        // Return default rates if database query fails
        return {
          hourly_rate: 10.00,
          minimum_charge: 5.00,
          grace_period_minutes: 15
        };
      }

      // If no active rates found, return defaults
      if (!fareRates || fareRates.length === 0) {
        console.log('No active fare rates found, using defaults');
        return {
          hourly_rate: 10.00,
          minimum_charge: 5.00,
          grace_period_minutes: 15
        };
      }

      return fareRates[0];
    } catch (err) {
      console.error('Error in getFareRates:', err);
      return {
        hourly_rate: 10.00,
        minimum_charge: 5.00,
        grace_period_minutes: 15
      };
    }
  }, []);

  // Handle entry detection with improved error handling
  const handleEntryDetection = useCallback(async (plateNumber: string, confidence: number, imageData?: string) => {
    if (!plateNumber || plateNumber.trim() === '') {
      console.error('Invalid plate number for entry detection');
      return;
    }

    try {
      console.log(`Processing entry detection for plate: ${plateNumber}`);
      
      const entryTime = new Date();
      const cameraLocation = "Entry Camera";

      // Check if there's already an active entry for this plate (no exit recorded)
      const { data: existingEntry, error: checkError } = await supabase
        .from('vehicle_detections')
        .select('*')
        .eq('plate_number', plateNumber)
        .is('exit_time', null)
        .not('entry_time', 'is', null)
        .order('entry_time', { ascending: false })
        .limit(1);

      if (checkError) {
        console.error('Error checking existing entry:', checkError);
        throw checkError;
      }

      if (existingEntry && existingEntry.length > 0) {
        console.log(`Vehicle ${plateNumber} already has an active entry. Updating entry time.`);
        
        // Update the existing entry with new timestamp
        const { error: updateError } = await supabase
          .from('vehicle_detections')
          .update({
            entry_time: entryTime.toISOString(),
            detection_timestamp: entryTime.toISOString(),
            confidence_score: confidence,
            image_url: imageData || null
          })
          .eq('id', existingEntry[0].id);

        if (updateError) {
          console.error('Error updating entry:', updateError);
          throw updateError;
        }

        toast({
          title: "Entry Updated",
          description: `${plateNumber} - Entry time updated`,
        });
      } else {
        // Create new entry record
        const { error: insertError } = await supabase
          .from('vehicle_detections')
          .insert({
            plate_number: plateNumber,
            confidence_score: confidence,
            camera_location: cameraLocation,
            image_url: imageData || null,
            status: 'entered',
            vehicle_type: 'vehicle',
            entry_time: entryTime.toISOString(),
            detection_timestamp: entryTime.toISOString()
          });

        if (insertError) {
          console.error('Error saving entry detection:', insertError);
          throw insertError;
        }

        toast({
          title: "Vehicle Entered",
          description: `${plateNumber} - Entry recorded at ${entryTime.toLocaleTimeString()}`,
        });
      }

      // Reload detections to show the latest data
      await loadDetections();

    } catch (err) {
      console.error('Error handling entry detection:', err);
      toast({
        title: "Entry Error",
        description: `Failed to process entry for ${plateNumber}`,
        variant: "destructive"
      });
    }
  }, [toast, loadDetections]);

  // Handle exit detection with improved fare calculation and error handling
  const handleExitDetection = useCallback(async (plateNumber: string, confidence: number, imageData?: string) => {
    if (!plateNumber || plateNumber.trim() === '') {
      console.error('Invalid plate number for exit detection');
      return;
    }

    try {
      console.log(`Processing exit detection for plate: ${plateNumber}`);
      
      const exitTime = new Date();
      const cameraLocation = "Exit Camera";

      // Find the most recent entry record without an exit
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
        throw entryError;
      }

      if (!entryRecords || entryRecords.length === 0) {
        console.log(`No active entry found for ${plateNumber}. Creating exit-only record.`);
        
        // Create exit-only record
        const { error: insertError } = await supabase
          .from('vehicle_detections')
          .insert({
            plate_number: plateNumber,
            confidence_score: confidence,
            camera_location: cameraLocation,
            image_url: imageData || null,
            status: 'exit_without_entry',
            vehicle_type: 'vehicle',
            exit_time: exitTime.toISOString(),
            detection_timestamp: exitTime.toISOString()
          });

        if (insertError) {
          console.error('Error creating exit-only record:', insertError);
          throw insertError;
        }

        toast({
          title: "Exit Recorded",
          description: `${plateNumber} - No entry record found`,
          variant: "destructive"
        });
        
        await loadDetections();
        return;
      }

      const entryRecord = entryRecords[0];
      
      if (!entryRecord.entry_time) {
        console.error('Entry record found but entry_time is null');
        toast({
          title: "Data Error",
          description: "Invalid entry time found",
          variant: "destructive"
        });
        return;
      }

      const entryTime = new Date(entryRecord.entry_time);
      
      console.log(`Found entry at: ${entryTime.toISOString()}, Exit at: ${exitTime.toISOString()}`);

      // Calculate duration in minutes
      const durationMinutes = Math.floor((exitTime.getTime() - entryTime.getTime()) / (1000 * 60));
      console.log(`Duration: ${durationMinutes} minutes`);

      if (durationMinutes < 0) {
        console.error('Invalid duration - exit time is before entry time');
        toast({
          title: "Calculation Error",
          description: "Invalid time sequence detected",
          variant: "destructive"
        });
        return;
      }

      // Get current fare rates
      const fareRates = await getFareRates();
      
      if (!fareRates) {
        console.error('Failed to get fare rates');
        toast({
          title: "Fare Error",
          description: "Could not retrieve fare rates",
          variant: "destructive"
        });
        return;
      }

      // Use the database function for consistent fare calculation
      const { data: fareCalculation, error: fareCalcError } = await supabase
        .rpc('calculate_vehicle_fare', {
          entry_timestamp: entryTime.toISOString(),
          exit_timestamp: exitTime.toISOString(),
          rate_per_hour: Number(fareRates.hourly_rate) || 10.00,
          minimum_charge: Number(fareRates.minimum_charge) || 5.00,
          grace_minutes: Number(fareRates.grace_period_minutes) || 15
        });

      if (fareCalcError) {
        console.error('Error calculating fare:', fareCalcError);
        throw fareCalcError;
      }

      if (!fareCalculation || fareCalculation.length === 0) {
        console.error('No fare calculation result returned');
        toast({
          title: "Calculation Error",
          description: "Failed to calculate fare",
          variant: "destructive"
        });
        return;
      }

      const calculatedFare = fareCalculation[0];
      const durationHours = Number(calculatedFare?.duration_hours) || 0;
      const fareAmount = Number(calculatedFare?.fare_amount) || Number(fareRates.minimum_charge) || 5.00;

      console.log(`Calculated: ${durationHours}h, $${fareAmount}`);

      // Update the entry record with exit information
      const { error: updateError } = await supabase
        .from('vehicle_detections')
        .update({
          exit_time: exitTime.toISOString(),
          duration_hours: durationHours,
          fare_amount: fareAmount,
          hourly_rate: Number(fareRates.hourly_rate) || 10.00,
          status: 'completed',
          detection_timestamp: exitTime.toISOString() // Update to show latest activity
        })
        .eq('id', entryRecord.id);

      if (updateError) {
        console.error('Error updating exit record:', updateError);
        throw updateError;
      }

      // Log the transaction
      try {
        await supabase.from('system_logs').insert({
          log_type: 'info',
          message: `Fare calculated for vehicle ${plateNumber}`,
          details: {
            plate_number: plateNumber,
            entry_time: entryTime.toISOString(),
            exit_time: exitTime.toISOString(),
            duration_minutes: durationMinutes,
            duration_hours: durationHours,
            fare_amount: fareAmount,
            hourly_rate: Number(fareRates.hourly_rate) || 10.00
          }
        });
      } catch (logError) {
        console.error('Error logging transaction:', logError);
        // Don't throw here, logging failure shouldn't stop the main process
      }

      // Show success message with fare details
      const durationText = durationMinutes < 60 
        ? `${durationMinutes}m` 
        : `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`;

      toast({
        title: "Exit Processed - Fare Calculated",
        description: `${plateNumber}: $${fareAmount.toFixed(2)} (${durationText} parked)`,
      });

      // Reload detections to show updated data
      await loadDetections();

    } catch (err) {
      console.error('Error handling exit detection:', err);
      toast({
        title: "Exit Error",
        description: `Failed to process exit for ${plateNumber}`,
        variant: "destructive"
      });
    }
  }, [toast, loadDetections, getFareRates]);

  // Main detection handler that routes to entry or exit
  const handleNewDetection = useCallback(async (plateNumber: string, confidence: number, imageData?: string, cameraType: 'entry' | 'exit' = 'entry') => {
    if (!plateNumber || plateNumber.trim() === '') {
      console.error('Invalid plate number received');
      return;
    }

    if (cameraType === 'entry') {
      await handleEntryDetection(plateNumber, confidence, imageData);
    } else if (cameraType === 'exit') {
      await handleExitDetection(plateNumber, confidence, imageData);
    } else {
      console.error('Invalid camera type:', cameraType);
    }
  }, [handleEntryDetection, handleExitDetection]);

  // Export detections data with improved error handling
  const handleExportData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_detections')
        .select('*')
        .order('detection_timestamp', { ascending: false });

      if (error) {
        console.error('Export error:', error);
        toast({
          title: "Export Error",
          description: "Failed to fetch data for export",
          variant: "destructive"
        });
        return;
      }

      if (!data || data.length === 0) {
        toast({
          title: "No Data",
          description: "No vehicle detection data available to export",
        });
        return;
      }

      // Convert to CSV with improved format
      const csvContent = [
        'Plate Number,Confidence,Detection Time,Camera Location,Status,Entry Time,Exit Time,Duration (Hours),Fare Amount,Hourly Rate',
        ...data.map(d => {
          const entryTime = d.entry_time ? new Date(d.entry_time).toLocaleString() : '';
          const exitTime = d.exit_time ? new Date(d.exit_time).toLocaleString() : '';
          const detectionTime = new Date(d.detection_timestamp || d.created_at).toLocaleString();
          
          return `"${d.plate_number}","${d.confidence_score || 0}%","${detectionTime}","${d.camera_location || ''}","${d.status || ''}","${entryTime}","${exitTime}","${d.duration_hours || ''}","${d.fare_amount || ''}","${d.hourly_rate || ''}"`;
        })
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
          event: '*',
          schema: 'public',
          table: 'vehicle_detections'
        },
        (payload) => {
          console.log('Real-time detection update:', payload);
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
