import { useEffect, useRef } from 'react';
import { resolveBarcodeOffline, LocalProduct } from '../db/dexieDb';
import { playScanBeep, playHologramBeep, playErrorBeep } from '../utils/audioBeep';

export interface ScanResult {
  rawBarcode: string;
  type: 'PRODUCT' | 'HOLOGRAM' | 'UNKNOWN';
  product?: LocalProduct;
  hologramSerial?: string;
  timestamp: number;
}

interface UseBarcodeScannerProps {
  onScan: (result: ScanResult) => void;
  enabled?: boolean;
}

export function useBarcodeScanner({ onScan, enabled = true }: UseBarcodeScannerProps) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const strokeTimesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore functional hotkeys like F1-F12, Escape, Tab
      if (e.key.startsWith('F') || e.key === 'Escape' || e.key === 'Tab') {
        return;
      }

      // If typing inside an explicit text input (like search box or note field),
      // we only capture if the input has attribute data-barcode-capture or keystrokes are < 35ms apart
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
      const now = performance.now();
      const elapsed = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Handle Enter (Scanner terminator)
      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim();
        const strokeTimes = strokeTimesRef.current;
        bufferRef.current = '';
        strokeTimesRef.current = [];

        // Calculate average stroke time
        let avgStrokeTime = 100;
        if (strokeTimes.length > 2) {
          const sum = strokeTimes.reduce((a, b) => a + b, 0);
          avgStrokeTime = sum / strokeTimes.length;
        }

        // Hardware scanners output with avgStrokeTime < 45ms or if input is not focused
        const isLikelyScanner = !isInput || avgStrokeTime < 50;

        if (barcode.length >= 4 && isLikelyScanner) {
          e.preventDefault();
          e.stopPropagation();

          // Sub-5ms IndexedDB lookup
          const result = await resolveBarcodeOffline(barcode);

          if (result.type === 'PRODUCT') {
            playScanBeep();
          } else if (result.type === 'HOLOGRAM') {
            playHologramBeep();
          } else {
            playErrorBeep();
          }

          onScan({
            rawBarcode: barcode,
            type: result.type,
            product: result.product,
            hologramSerial: result.hologramSerial,
            timestamp: Date.now()
          });
        }
        return;
      }

      // Collect printable characters
      if (e.key.length === 1) {
        // If elapsed time is large (> 300ms), reset buffer
        if (elapsed > 300) {
          bufferRef.current = '';
          strokeTimesRef.current = [];
        } else {
          strokeTimesRef.current.push(elapsed);
        }

        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, onScan]);

  // Manual programmatic scan simulation (useful for testing or on-screen barcode sweep triggers)
  const triggerManualScan = async (code: string) => {
    const result = await resolveBarcodeOffline(code);
    if (result.type === 'PRODUCT') {
      playScanBeep();
    } else if (result.type === 'HOLOGRAM') {
      playHologramBeep();
    } else {
      playErrorBeep();
    }

    onScan({
      rawBarcode: code,
      type: result.type,
      product: result.product,
      hologramSerial: result.hologramSerial,
      timestamp: Date.now()
    });
  };

  return { triggerManualScan };
}
