import { json } from '@sveltejs/kit';

export const GET = async () => {
  try {
    console.log('🔍 Error diagnostic endpoint hit');
    
    return json({
      status: 'success',
      message: 'Error diagnostic endpoint is working',
      timestamp: new Date().toISOString(),
      server: 'running'
    });
  } catch (error) {
    console.error('❌ Error in diagnostic endpoint:', error);
    
    return json({
      status: 'error',
      message: 'Error in diagnostic endpoint',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};
