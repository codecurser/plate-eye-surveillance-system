
-- Add fare calculation columns to vehicle_detections table
ALTER TABLE public.vehicle_detections 
ADD COLUMN entry_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN exit_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN duration_hours DECIMAL(10,2),
ADD COLUMN fare_amount DECIMAL(10,2),
ADD COLUMN hourly_rate DECIMAL(10,2) DEFAULT 10.00;

-- Create a fare_rates table for configurable pricing
CREATE TABLE public.fare_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_name TEXT NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  minimum_charge DECIMAL(10,2) DEFAULT 5.00,
  grace_period_minutes INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default fare rate
INSERT INTO public.fare_rates (rate_name, hourly_rate, minimum_charge, grace_period_minutes)
VALUES ('Standard Rate', 10.00, 5.00, 15);

-- Enable RLS for fare_rates table
ALTER TABLE public.fare_rates ENABLE ROW LEVEL SECURITY;

-- Create policy for fare_rates
CREATE POLICY "Allow public access to fare rates" ON public.fare_rates FOR ALL USING (true);

-- Create function to calculate fare
CREATE OR REPLACE FUNCTION calculate_vehicle_fare(
  entry_timestamp TIMESTAMP WITH TIME ZONE,
  exit_timestamp TIMESTAMP WITH TIME ZONE,
  rate_per_hour DECIMAL DEFAULT 10.00,
  minimum_charge DECIMAL DEFAULT 5.00,
  grace_minutes INTEGER DEFAULT 15
)
RETURNS TABLE(
  duration_hours DECIMAL,
  fare_amount DECIMAL
) AS $$
DECLARE
  duration_minutes INTEGER;
  calculated_hours DECIMAL;
  calculated_fare DECIMAL;
BEGIN
  -- Calculate duration in minutes
  duration_minutes := EXTRACT(EPOCH FROM (exit_timestamp - entry_timestamp)) / 60;
  
  -- If within grace period, return minimum charge
  IF duration_minutes <= grace_minutes THEN
    RETURN QUERY SELECT 0::DECIMAL, minimum_charge;
    RETURN;
  END IF;
  
  -- Calculate hours (round up to next hour for partial hours)
  calculated_hours := CEIL(duration_minutes::DECIMAL / 60);
  
  -- Calculate fare
  calculated_fare := GREATEST(calculated_hours * rate_per_hour, minimum_charge);
  
  RETURN QUERY SELECT calculated_hours, calculated_fare;
END;
$$ LANGUAGE plpgsql;
