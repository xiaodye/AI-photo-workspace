// 在页面绘制前应用主题，避免暗色模式首次加载时闪白。
(() => {
  let preference = 'system'
  try {
    const saved = localStorage.getItem('ai-photo-theme')
    if (saved === 'light' || saved === 'dark') preference = saved
  } catch {}
  const theme = preference === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : preference
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
})()
