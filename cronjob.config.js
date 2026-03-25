require('dotenv').config();

module.exports = {
  apps: [{
    name: `DeleteListMS-${process.env.REGION_NAME ? process.env.REGION_NAME : ''}`,
    script: "./index.js",
    instances: 1,
    exec_mode: 'fork',
    cron_restart: "0 */8 * * *",
    autorestart: false
  }]
}