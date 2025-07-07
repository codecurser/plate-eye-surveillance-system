
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Car, Clock, MapPin } from 'lucide-react';

interface Detection {
  id: string;
  plateNumber: string;
  timestamp: Date;
  confidence: number;
  location: string;
}

const DetectionResults = ({ detections }: { detections: Detection[] }) => {
  const latestDetection = detections[0];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Car className="w-5 h-5" />
          Latest Detection
        </CardTitle>
      </CardHeader>
      <CardContent>
        {latestDetection ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold license-plate text-primary mb-2">
                {latestDetection.plateNumber}
              </div>
              <Badge variant="secondary" className="text-xs">
                Confidence: {latestDetection.confidence}%
              </Badge>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{latestDetection.timestamp.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{latestDetection.location}</span>
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-accent">{detections.length}</div>
                <div className="text-xs text-muted-foreground">Total Today</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {detections.filter(d => 
                    new Date().getTime() - d.timestamp.getTime() < 3600000
                  ).length}
                </div>
                <div className="text-xs text-muted-foreground">Last Hour</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No vehicles detected yet</p>
            <p className="text-sm">System is actively monitoring...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DetectionResults;
