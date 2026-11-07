import { useCallback, useEffect, useRef } from 'react';

export function useReaderHistory(isOpen, onClose, readerId) {
  const onCloseRef = useRef(onClose);
  const tokenRef = useRef(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    let token = tokenRef.current;
    if (!token || window.history.state?.readerOverlay !== token) {
      token = `${readerId}-${Date.now()}-${Math.random()}`;
      tokenRef.current = token;
      const currentState =
        window.history.state && typeof window.history.state === 'object'
          ? window.history.state
          : {};
      window.history.pushState({ ...currentState, readerOverlay: token }, '');
    }

    const handlePopState = () => {
      tokenRef.current = null;
      onCloseRef.current();
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeReader();
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, readerId]);

  const closeReader = useCallback(() => {
    const token = tokenRef.current;
    if (token && window.history.state?.readerOverlay === token) {
      window.history.back();
    } else {
      onCloseRef.current();
    }
  }, []);

  return closeReader;
}
