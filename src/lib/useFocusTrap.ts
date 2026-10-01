import { useEffect, useRef } from 'react';

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  isOpen: boolean,
  onClose?: () => void
) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    if (!container) return;

    // Save previous active element to restore focus when modal closes
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Selector for focusable elements
    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const getFocusableElements = () => {
      if (!container) return [];
      return Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((el) => el.offsetParent !== null && !el.hasAttribute('disabled'));
    };

    const focusable = getFocusableElements();
    if (focusable.length > 0) {
      // Focus first element or container
      setTimeout(() => {
        focusable[0]?.focus();
      }, 50);
    } else {
      container.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onClose) {
          e.preventDefault();
          onClose();
        }
        return;
      }

      if (e.key === 'Tab') {
        const elements = getFocusableElements();
        if (elements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = elements[0];
        const lastElement = elements[elements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || document.activeElement === container) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, onClose]);

  return containerRef;
}
