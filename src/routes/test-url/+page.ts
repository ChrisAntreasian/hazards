export const load = async ({ url }: { url: URL }) => {
  // Log everything we can about the incoming URL
  console.log('🔍 TEST URL - Full URL:', url.toString());
  console.log('🔍 TEST URL - Origin:', url.origin);
  console.log('🔍 TEST URL - Pathname:', url.pathname);
  console.log('🔍 TEST URL - Search:', url.search);
  console.log('🔍 TEST URL - Hash:', url.hash);
  console.log('🔍 TEST URL - Search Params:', Object.fromEntries(url.searchParams));
  
  // Check for tokens in various locations
  const accessToken = url.searchParams.get('access_token');
  const refreshToken = url.searchParams.get('refresh_token');
  const type = url.searchParams.get('type');
  
  console.log('🔍 TEST URL - Tokens found:', {
    accessToken: accessToken ? 'present' : 'missing',
    refreshToken: refreshToken ? 'present' : 'missing',
    type
  });
  
  return {
    urlInfo: {
      full: url.toString(),
      origin: url.origin,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      searchParams: Object.fromEntries(url.searchParams),
      hasTokens: !!(accessToken && refreshToken)
    }
  };
};
