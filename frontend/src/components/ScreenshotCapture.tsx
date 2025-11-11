/**
 * Screenshot Capture Tool
 * 
 * Manual screenshot helper - visit each page and click capture
 * Uses html2canvas to capture the current view
 */

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Camera, Download, Check, Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface ScreenshotCaptureProps {
  enabled?: boolean;
}

export function ScreenshotCapture({ enabled = false }: ScreenshotCaptureProps) {
  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState(false);
  const location = useLocation();

  if (!enabled) return null;

  const captureScreenshot = async () => {
    setCapturing(true);
    setCaptured(false);

    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;

      // Capture the entire document
      const canvas = await html2canvas(document.body, {
        allowTaint: true,
        useCORS: true,
        scale: 2, // High quality
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
      });

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          // Create download link
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          
          // Generate filename from current route
          const pageName = location.pathname
            .replace(/\//g, '-')
            .replace(/^-/, '')
            .replace(/-$/, '') || 'landing-page';
          
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          link.download = `livestockway-${pageName}-${timestamp}.png`;
          link.href = url;
          link.click();
          
          // Cleanup
          URL.revokeObjectURL(url);
          
          setCaptured(true);
          setTimeout(() => setCaptured(false), 3000);
        }
      }, 'image/png');

    } catch (error) {
      console.error('Screenshot failed:', error);
      alert('Screenshot capture failed. Make sure html2canvas is installed.');
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="p-4 shadow-lg bg-white dark:bg-gray-800 border-2 border-blue-500">
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <div className="font-semibold">Screenshot Tool</div>
            <div className="text-xs text-gray-500">
              {location.pathname}
            </div>
          </div>
          
          <Button
            onClick={captureScreenshot}
            disabled={capturing}
            size="sm"
            className="gap-2"
          >
            {capturing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Capturing...
              </>
            ) : captured ? (
              <>
                <Check className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                Capture
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
