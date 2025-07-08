
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageData } = await req.json()
    
    if (!imageData) {
      return new Response(
        JSON.stringify({ error: 'No image data provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Processing image for license plate detection...')
    
    // Get API token from environment
    const PLATE_RECOGNIZER_TOKEN = Deno.env.get('PLATE_RECOGNIZER_TOKEN')
    
    if (!PLATE_RECOGNIZER_TOKEN) {
      console.error('PLATE_RECOGNIZER_TOKEN not found in environment')
      return new Response(
        JSON.stringify({ error: 'API configuration missing' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Call Plate Recognizer API
    const detectionResult = await detectPlateWithAPI(imageData, PLATE_RECOGNIZER_TOKEN)
    
    if (detectionResult.detected) {
      console.log(`License plate detected: ${detectionResult.plateNumber} (${detectionResult.confidence}% confidence)`)
      
      return new Response(
        JSON.stringify({
          plateNumber: detectionResult.plateNumber,
          confidence: detectionResult.confidence,
          detected: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      console.log('No license plate detected in image')
      return new Response(
        JSON.stringify({ detected: false }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('Detection error:', error)
    return new Response(
      JSON.stringify({ error: 'Detection failed', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Real license plate detection using Plate Recognizer API
async function detectPlateWithAPI(imageData: string, apiToken: string) {
  try {
    // Convert base64 image to blob for API
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '')
    
    // Create form data for the API request
    const formData = new FormData()
    
    // Convert base64 to blob
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'image/jpeg' })
    
    formData.append('upload', blob, 'image.jpg')
    formData.append('regions', 'us,eu,in') // Support multiple regions
    
    console.log('Calling Plate Recognizer API...')
    
    const response = await fetch('https://api.platerecognizer.com/v1/plate-reader/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiToken}`,
      },
      body: formData,
    })
    
    if (!response.ok) {
      console.error('API Response Error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error details:', errorText)
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }
    
    const result = await response.json()
    console.log('API Response:', JSON.stringify(result, null, 2))
    
    if (result.results && result.results.length > 0) {
      const plate = result.results[0]
      const confidence = Math.round(plate.score * 100)
      
      // Only return plates with reasonable confidence (above 70%)
      if (confidence >= 70) {
        return {
          detected: true,
          plateNumber: plate.plate.toUpperCase(),
          confidence: confidence
        }
      }
    }
    
    return { detected: false }
    
  } catch (error) {
    console.error('Error in detectPlateWithAPI:', error)
    throw error
  }
}
