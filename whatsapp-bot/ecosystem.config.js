module.exports = {
  apps: [{
    name: 'linah-whatsapp-bot',
    script: 'index.js',
    cwd: __dirname,
    env: {
      GEMINI_API_KEY: 'AQ.Ab8RN6JhHFnYqNt6F2O2yf3UX1qdBFvqjhCY3YO8e0wVIGS0dg',
      WHATSAPP_GROUP_NAMES: 'صيانة'
    },
    log_date_format: 'HH:mm:ss',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_restarts: 10
  }]
};
