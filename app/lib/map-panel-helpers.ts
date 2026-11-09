declare global {
  interface Window {
    google?: any;
    otosanayideMapReady?: () => void;
  }
}

let mapsPromise: Promise<void> | undefined;

export function loadMaps(key: string) {
  if (window.google?.maps) return Promise.resolve();
  return (mapsPromise ??= new Promise<void>((resolve, reject) => {
    window.otosanayideMapReady = resolve;
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=otosanayideMapReady&loading=async`;
    s.async = true;
    s.onerror = () => {
      mapsPromise = undefined;
      reject(Error('Harita yüklenemedi.'));
    };
    document.head.appendChild(s);
  }));
}
