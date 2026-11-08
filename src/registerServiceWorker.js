const reloadForControllerUpdate = () => {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;

  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      await registration.update();
    } catch (error) {
      console.error('Failed to check for application updates:', error);
    }
  });
};

reloadForControllerUpdate();
