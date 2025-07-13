
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
      console.error('No image data provided in request')
      return new Response(
        JSON.stringify({ error: 'No image data provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Processing image for high-precision license plate detection...')
    console.log('Image data length:', imageData.length)
    
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

    console.log('API token found, processing with high-precision detection...')

    // Call Plate Recognizer API
    const detectionResult = await detectPlateWithAPI(imageData, PLATE_RECOGNIZER_TOKEN)
    
    if (detectionResult.detected && detectionResult.confidence >= 95) {
      console.log(`HIGH-CONFIDENCE license plate detected: ${detectionResult.plateNumber} (${detectionResult.confidence}% confidence)`)
      
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
    } else if (detectionResult.detected && detectionResult.confidence < 95) {
      console.log(`Low-confidence detection rejected: ${detectionResult.plateNumber} (${detectionResult.confidence}% confidence - below 95% threshold)`)
      return new Response(
        JSON.stringify({ 
          detected: false, 
          reason: 'confidence_too_low',
          confidence: detectionResult.confidence,
          plateNumber: detectionResult.plateNumber
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      console.log('No license plate detected in image')
      return new Response(
        JSON.stringify({ detected: false, reason: 'no_plate_found' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('Detection error:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    return new Response(
      JSON.stringify({ 
        error: 'Detection failed', 
        details: error.message,
        errorType: error.name
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// High-precision license plate detection using Plate Recognizer API
async function detectPlateWithAPI(imageData: string, apiToken: string) {
  try {
    console.log('Starting high-precision API detection process...')
    
    // Validate image data format
    if (!imageData.startsWith('data:image/')) {
      console.error('Invalid image data format - missing data URL prefix')
      throw new Error('Invalid image data format')
    }
    
    // Convert base64 image to blob for API
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '')
    console.log('Base64 data length after processing:', base64Data.length)
    
    if (base64Data.length === 0) {
      console.error('Empty base64 data after processing')
      throw new Error('Empty image data')
    }
    
    // Create form data for the API request
    const formData = new FormData()
    
    // Convert base64 to blob
    let byteCharacters: string
    let byteNumbers: number[]
    let byteArray: Uint8Array
    let blob: Blob
    
    try {
      byteCharacters = atob(base64Data)
      byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      byteArray = new Uint8Array(byteNumbers)
      blob = new Blob([byteArray], { type: 'image/jpeg' })
      console.log('Blob created successfully, size:', blob.size)
    } catch (blobError) {
      console.error('Error creating blob from base64:', blobError)
      throw new Error('Failed to process image data')
    }
    
    formData.append('upload', blob, 'image.jpg')
    formData.append('regions', 'us-ca') // North America regions
    formData.append('camera_id', 'high_precision_camera') // Add camera ID for better tracking
    
    console.log('Calling Plate Recognizer API for high-precision detection...')
    
    const response = await fetch('https://api.platerecognizer.com/v1/plate-reader/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiToken}`,
      },
      body: formData,
    })
    
    console.log('API Response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Response Error:', response.status, response.statusText)
      console.error('Error response body:', errorText)
      
      // Handle specific error cases
      if (response.status === 401) {
        throw new Error('Invalid API token - please check your Plate Recognizer API key')
      } else if (response.status === 429) {
        throw new Error('API rate limit exceeded - please wait before trying again')
      } else if (response.status === 400) {
        throw new Error('Invalid image format or corrupted image data')
      } else {
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
      }
    }
    
    const result = await response.json()
    console.log('API Response data:', JSON.stringify(result, null, 2))
    
    if (result.results && result.results.length > 0) {
      // Sort results by confidence and get the highest one
      const sortedResults = result.results.sort((a: any, b: any) => b.score - a.score)
      const plate = sortedResults[0]
      const confidence = Math.round(plate.score * 100)
      
      console.log(`Found plate: ${plate.plate} with ${confidence}% confidence`)
      
      return {
        detected: true,
        plateNumber: plate.plate.toUpperCase(),
        confidence: confidence
      }
    } else {
      console.log('No plates found in API response')
    }
    
    return { detected: false }
    
  } catch (error) {
    console.error('Error in detectPlateWithAPI:', error)
    console.error('Full error object:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    throw error
  }
}
