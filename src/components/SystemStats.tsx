
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Shield, Clock, Database, DollarSign, TrendingUp } from 'lucide-react';

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

const SystemStats = ({ detections }: { detections: Detection[] }) => {
  const totalDetections = detections.length;
  const todayDetections = detections.filter(d => 
    new Date(d.timestamp).toDateString() === new Date().toDateString()
  ).length;
  
  const exitDetections = detections.filter(d => d.cameraType === 'exit' && d.fareAmount);
  const totalRevenue = exitDetections.reduce((sum, d) => sum + (d.fareAmount || 0), 0);
  const avgFare = exitDetections.length > 0 ? totalRevenue / exitDetections.length : 0;
  
  const avgConfidence = detections.length > 0 
    ? Math.round(detections.reduce((acc, d) => acc + d.confidence, 0) / detections.length)
    : 0;
    
  const systemUptime = "24:15:32";

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="w-5 h-5" />
          System Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <Database className="w-6 h-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold text-primary">{totalDetections}</div>
              <div className="text-xs text-muted-foreground">Total Detections</div>
            </div>
            
            <div className="text-center p-4 bg-accent/10 rounded-lg">
              <Shield className="w-6 h-6 mx-auto mb-2 text-accent" />
              <div className="text-2xl font-bold text-accent">{avgConfidence}%</div>
              <div className="text-xs text-muted-foreground">Avg Confidence</div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground">Total Revenue</div>
            </div>
            
            <div className="text-center p-4 bg-secondary rounded-lg">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-foreground" />
              <div className="text-2xl font-bold">${avgFare.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Avg Fare</div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Today's Vehicles</span>
            <Badge variant="default">
              {todayDetections}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Paid Exits</span>
            <Badge variant="default" className="bg-green-600">
              {exitDetections.length}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">System Status</span>
            <Badge variant="default" className="bg-accent">
              Active
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemStats;
