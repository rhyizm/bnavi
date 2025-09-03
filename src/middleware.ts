import { NextRequest, NextResponse } from 'next/server';
import { i18nRouter } from 'next-i18n-router';
import { i18nConfig } from '../i18nConfig';

export function middleware(request: NextRequest): NextResponse {
  const { pathname, origin: appOrigin } = request.nextUrl;
  const requestOriginHeader = request.headers.get('Origin');

  if (pathname.startsWith('/api/')) {
    const isCrossOrigin = requestOriginHeader && requestOriginHeader !== appOrigin;

    if (isCrossOrigin) {
      const requestApiKey = request.headers.get('x-api-key');
      const serverApiKey = process.env.API_KEY;

      if (!serverApiKey || requestApiKey !== serverApiKey) {
        return NextResponse.json({ error: 'Unauthorized: API Key required for cross-origin requests' }, { status: 401 });
      }
    }

    return NextResponse.next();
  }

  return i18nRouter(request, i18nConfig);
}

export const config = {
  matcher: '/((?!static|.*\\..*|_next).*)',
};
