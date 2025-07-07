
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Shield, Clock, Database } from 'lucide-react';

interface Detection {
  id: string;
  plateNumber: string;
  timestamp: Date;
  confidence: number;
  location: string;
}

const SystemStats = ({ detections }: { detections: Detection[] }) => {
  const totalDetections = detections.length;
  const todayDetections = detections.filter(d => 
    new Date(d.timestamp).toDateString() === new Date().toDateString()
  ).length;
  
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
            <div className="text-center p-4 bg-secondary rounded-lg">
              <Activity className="w-6 h-6 mx-auto mb-2 text-foreground" />
              <div className="text-2xl font-bold">{todayDetections}</div>
              <div className="text-xs text-muted-foreground">Today's Count</div>
            </div>
            
            <div className="text-center p-4 bg-secondary rounded-lg">
              <Clock className="w-6 h-6 mx-auto mb-2 text-foreground" />
              <div className="text-sm font-bold font-mono">{systemUptime}</div>
              <div className="text-xs text-muted-foreground">System Uptime</div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">System Status</span>
            <Badge variant="default" className="bg-accent">
              Active
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Camera Status</span>
            <Badge variant="default">
              Online
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemStats;
