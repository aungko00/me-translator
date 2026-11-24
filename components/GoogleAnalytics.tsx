'use client';

import { useEffect, useState } from 'react';
import {
  getEnvMeasurementId,
  initGoogleAnalytics,
  normalizeMeasurementId,
} from '@/lib/analytics';
import { isRunningInsideCapacitor } from '@/lib/app-update';

interface GoogleAnalyticsProps {
  measurementId?: string;
}

export default function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const initialId =
    normalizeMeasurementId(measurementId) || getEnvMeasurementId();
  const [resolvedId, setResolvedId] = useState<string>(initialId);

  useEffect(() => {
    if (resolvedId) {
      initGoogleAnalytics(resolvedId);
      return;
    }

    if (isRunningInsideCapacitor()) {
      return;
    }

    let cancelled = false;
    fetch('/api/analytics-config', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { measurementId?: string } | null) => {
        if (cancelled) return;
        const id = normalizeMeasurementId(data?.measurementId);
        if (id) {
          setResolvedId(id);
          initGoogleAnalytics(id);
        }
      })
      .catch(() => {
        // Ignore network/offline errors during analytics config lookup
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedId]);

  useEffect(() => {
    if (!resolvedId) return;

    const handleOnline = () => {
      initGoogleAnalytics(resolvedId);
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [resolvedId]);

  return null;
}
