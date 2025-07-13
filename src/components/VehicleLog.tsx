
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FileText, TrendingUp, DollarSign, Timer, ArrowRight } from 'lucide-react';

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

const VehicleLog = ({ detections }: { detections: Detection[] }) => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Vehicle Activity Log
          </div>
          <Badge variant="outline" className="gap-1">
            <TrendingUp className="w-3 h-3" />
            {detections.length} entries
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-6">
          {detections.length > 0 ? (
            <div className="space-y-3">
              {detections.map((detection, index) => (
                <div key={detection.id}>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="license-plate font-bold text-primary">
                          {detection.plateNumber}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {detection.confidence}%
                        </Badge>
                        {detection.cameraType === 'entry' && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                            <ArrowRight className="w-3 h-3 mr-1" />
                            Entry
                          </Badge>
                        )}
                        {detection.cameraType === 'exit' && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
                            <ArrowRight className="w-3 h-3 mr-1 rotate-180" />
                            Exit
                          </Badge>
                        )}
                        {detection.fareAmount && (
                          <Badge variant="default" className="bg-green-600 text-white text-xs">
                            <DollarSign className="w-3 h-3 mr-1" />
                            ${detection.fareAmount.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-4 flex-wrap">
                        <span>{detection.timestamp.toLocaleString()}</span>
                        <span>• {detection.location}</span>
                        {detection.durationHours && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              {detection.durationHours.toFixed(1)}h parked
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < detections.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No detections recorded</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default VehicleLog;
