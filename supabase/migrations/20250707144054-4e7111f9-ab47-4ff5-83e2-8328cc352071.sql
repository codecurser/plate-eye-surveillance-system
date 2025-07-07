
-- Create table for storing detected vehicles
CREATE TABLE public.vehicle_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number TEXT NOT NULL,
  confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  detection_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  camera_location TEXT DEFAULT 'Main Gate - Camera 01',
  image_url TEXT,
  vehicle_type TEXT,
  status TEXT DEFAULT 'detected' CHECK (status IN ('detected', 'verified', 'flagged')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for camera configurations
CREATE TABLE public.camera_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_name TEXT NOT NULL,
  camera_url TEXT,
  location TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  detection_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for system logs
CREATE TABLE public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type TEXT CHECK (log_type IN ('detection', 'error', 'info', 'warning')),
  message TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default camera configuration
INSERT INTO public.camera_configs (camera_name, location, camera_url) 
VALUES ('Main Gate Camera', 'Main Gate - Camera 01', 'user_media');

-- Add indexes for better performance
CREATE INDEX idx_vehicle_detections_timestamp ON public.vehicle_detections(detection_timestamp DESC);
CREATE INDEX idx_vehicle_detections_plate ON public.vehicle_detections(plate_number);
CREATE INDEX idx_system_logs_timestamp ON public.system_logs(timestamp DESC);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE public.vehicle_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access for now (you can restrict later with authentication)
CREATE POLICY "Allow public access to vehicle detections" ON public.vehicle_detections FOR ALL USING (true);
CREATE POLICY "Allow public access to camera configs" ON public.camera_configs FOR ALL USING (true);
CREATE POLICY "Allow public access to system logs" ON public.system_logs FOR ALL USING (true);
