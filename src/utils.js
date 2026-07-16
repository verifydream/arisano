export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function extractPhone(waId) {
  // Fonnte sends "628xxx@s.whatsapp.net" or just "628xxx"
  return (waId || '').replace('@s.whatsapp.net', '').replace('@g.us', '');
}
