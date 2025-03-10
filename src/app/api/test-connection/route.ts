import { NextResponse } from 'next/server';
import { errorHandler, handleApiError } from '../../../lib/error-handler';

const OLLAMA_HOST = '127.0.0.1';
const OLLAMA_PORT = 11434;
const OLLAMA_ENDPOINT = `http://${OLLAMA_HOST}:${OLLAMA_PORT}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

async function makeRequest(path: string, method = 'GET', body?: any) {
  return errorHandler.withRecovery(async () => {
    const response = await fetch(`${OLLAMA_ENDPOINT}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }

    const data = await response.json();
    return data;
  });
}

export async function GET() {
  try {
    console.log('Checking Ollama server connection...');
    
    // Test server connection
    const version = await makeRequest('/api/version');
    console.log('Ollama version:', version);

    // Get list of available models
    const models = await makeRequest('/api/tags');
    const modelNames = models.models?.map((m: any) => m.name) || [];
    console.log('Available models:', modelNames);

    // Check if required models are available
    const hasDeepseek = modelNames.includes('deepseek-r1:14b');
    const hasQwen = modelNames.includes('qwen2.5-coder:latest');

    if (!hasDeepseek || !hasQwen) {
      const missingModels = [];
      if (!hasDeepseek) missingModels.push('deepseek-r1:14b');
      if (!hasQwen) missingModels.push('qwen2.5-coder:latest');

      return NextResponse.json(
        { 
          error: `Missing required models: ${missingModels.join(', ')}. Please install them using 'ollama pull' command.`,
          models: modelNames
        },
        {
          status: 503,
          headers: corsHeaders
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        version: version.version,
        models: modelNames
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Connection test failed:', error);
    
    // Use our error handler to format the response
    return handleApiError(error);
  }
}
