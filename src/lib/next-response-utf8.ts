// lib/utf8Json.ts
import { NextResponse } from 'next/server';

export function NextResponseUtf8(data: unknown, init: ResponseInit = {}) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(init.headers ?? {})
    }
  });
}
