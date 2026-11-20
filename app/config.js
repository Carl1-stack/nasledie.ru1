/* Наследие app settings (public: nothing secret here). */
window.NCONF = {
  api: 'https://nasledie-api.carlb6918.workers.dev',   // Cloudflare gatekeeper (codes, paid lessons, progress, voice notes, Лера)
  whatsapp: '+201064114187',                          // the teacher's number on the locked page
  results: 'https://script.google.com/macros/s/AKfycbwNPU3XZTQkiBJPB4v-MA9moCOiAY79Hr-08gnGCufn7AlLE-2WrV0fsN9CX6pvNoEgpA/exec',   // quiz results → Google sheet + email (same receiver as the quiz pages)
  vapid: 'BC-5zFJ8aizEJZSX0mm1bmGUbaKUWsY1VeEXlg7Px1jRIkcX8ePbeaJpByzZZhL-gQeaANAf7p-B7sPpYLmPhWI'   // daily reminders (public key)
};
