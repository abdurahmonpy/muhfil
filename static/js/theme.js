(function () {
  try {
    // Saytda background faqat qora (Dark mode doimiy)
    document.documentElement.classList.add('dark');
    document.documentElement.style.backgroundColor = '#121212';
    document.documentElement.style.colorScheme = 'dark';

    /* Dark mode qismi vaqtinchalik commentga olindi:
    var path = window.location.pathname;
    if (path.includes('/about')) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#191919';
      document.documentElement.style.colorScheme = 'dark';
      return;
    }
    if (path === '/' || path === '' || path.endsWith('index.html') || document.documentElement.classList.contains('light-only')) {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#F7F4ED';
      document.documentElement.style.colorScheme = 'light';
      return;
    }
    var s = localStorage.getItem('medium_theme');
    var p = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (s === 'dark' || (!s && p)) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#121212';
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#ffffff';
      document.documentElement.style.colorScheme = 'light';
    }
    */
  } catch (e) {}
})();
