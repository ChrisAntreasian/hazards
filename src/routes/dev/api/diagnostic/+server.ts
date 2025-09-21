import { json } from '@sveltejs/kit';

export const GET = async () => {
  try {
    console.log('Dev API: Diagnostic endpoint accessed');
    
    return json({
      status: 'success',
      message: 'Diagnostic endpoint is working',
      timestamp: new Date().toISOString(),
      server: 'running'
    });
  } catch (error) {
    console.error('Dev API: Diagnostic endpoint error -', error instanceof Error ? error.message : String(error));
    
    return json({
      status: 'error',
      message: 'Error in diagnostic endpoint',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};
