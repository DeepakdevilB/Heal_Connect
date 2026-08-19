import { useEffect } from 'react';
import { toast } from 'react-hot-toast';

export function useScreenshotProtection(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    // 1. Listen for common screenshot shortcut keys
    const handleKeyDown = (e: KeyboardEvent) => {
      // Mac shortcuts: Cmd+Shift+3/4/5
      if (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) {
        e.preventDefault();
        toast.error('Screenshots are disabled for privacy reasons.');
      }
      
      // Print Screen key
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        // We can't actually prevent the OS from taking the screenshot,
        // but we can try to clear the clipboard or show a warning.
        toast.error('Screenshots are disabled for privacy reasons.');
        try {
          navigator.clipboard.writeText('Screenshots are disabled on this platform.');
        } catch (err) {
          // Ignore
        }
      }

      // Cmd/Ctrl + S or Cmd/Ctrl + P
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p')) {
        e.preventDefault();
        toast.error('Saving and printing are disabled.');
      }
    };

    // 2. Clear clipboard on copy event to prevent copying chat text
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.error('Copying text is disabled for privacy reasons.');
    };

    // 3. Blur app on visibility loss (prevents background app switch screenshotting on mobile)
    const handleVisibilityChange = () => {
      const root = document.getElementById('root') || document.body;
      if (document.hidden) {
        root.style.filter = 'blur(10px)';
      } else {
        root.style.filter = 'none';
      }
    };

    // Inject print protection CSS
    const styleId = 'anti-screenshot-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        @media print {
          body {
            display: none !important;
          }
        }
        /* Disable text selection */
        .anti-screenshot-protect {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
      `;
      document.head.appendChild(style);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyDown);
    window.addEventListener('copy', handleCopy);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyDown);
      window.removeEventListener('copy', handleCopy);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      const root = document.getElementById('root') || document.body;
      root.style.filter = 'none';
      const style = document.getElementById(styleId);
      if (style) style.remove();
    };
  }, [enabled]);
}
