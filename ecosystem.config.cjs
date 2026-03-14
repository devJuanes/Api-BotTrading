module.exports = {
  apps: [
    {
      name: 'bot-trading',
      script: './dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 4060,
      },
    },
  ],
}
