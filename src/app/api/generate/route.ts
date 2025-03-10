import { NextResponse } from 'next/server';
import { errorHandler, handleApiError } from '../../../lib/error-handler';

const OLLAMA_ENDPOINT = 'http://127.0.0.1:11434';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

async function generateResponse(body: any) {
  return errorHandler.withRecovery(async () => {
    const response = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = new Error(`Ollama API error: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }

    return response.json();
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Generate request:', {
      model: body.model,
      promptLength: body.prompt?.length || 0
    });
    
    const data = await generateResponse(body);
    
    console.log('Generate response:', {
      status: 'success',
      responseLength: data.response?.length || 0
    });

    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    // Use our error handler to format the response, but add CORS headers
    const errorResponse = handleApiError(error);
    // Add CORS headers to the error response
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    errorResponse.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return errorResponse;
  }
}
