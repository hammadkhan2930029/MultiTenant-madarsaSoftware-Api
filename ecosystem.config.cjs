module.exports = {
  apps: [{
    name: 'madarsa-api',
    script: './src/server.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '750M',
    restart_delay: 2000,
    exp_backoff_restart_delay: 100,
    min_uptime: '10s',
    max_restarts: 20,
    kill_timeout: 10000,
    listen_timeout: 10000,
    time: true,
    env: {
      NODE_ENV: 'production',
    },
  }],
};
