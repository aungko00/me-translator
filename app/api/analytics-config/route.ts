import { NextResponse } from 'next/server';
import { normalizeMeasurementId } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET() {
  const candidates = [
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    process.env.GA_MEASUREMENT_ID,
    process.env.GA4_MEASUREMENT_ID,
    process.env.G4_MEASUREMENT_ID,
    process.env.G4,
  ];

  const measurementId =
    candidates.map((v) => normalizeMeasurementId(v)).find(Boolean) || '';

  return NextResponse.json(
    { measurementId },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
