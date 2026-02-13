# Webhook Deployment Setup

## Overview
This project uses a **GitHub Webhook** to automatically deploy changes when the `master` branch is updated. The deployment process is handled by a Node.js server and a deployment script.

---

## Webhook Setup

### 1. Configure GitHub Webhook

1. Go to your GitHub repository settings
2. Navigate to **Settings** > **Webhooks**
3. Click **Add webhook** and configure:
   - **Payload URL**: `http://<your-server-ip>:7777/ud-api-hook`
   - **Content Type**: `application/json`
   - **Which events would you like to trigger this webhook?**: Select **"Just the push event"**
4. Save the webhook

GitHub will now send a POST request to your server whenever changes are pushed to the `master` branch.

---

## Webhook Server

### Installation

1. **Install dependencies**:
   ```bash
   npm install express shelljs
   ```

2. **Create `index.js` file** (webhook server):
   ```javascript
   const express = require("express");
   const shell = require('shelljs');
   const { exec } = require('child_process');

   const app = express();

   app.use(express.json());

   // Test Route to confirm the server is working
   app.get("/", (req, res) => res.status(200).send({ message: "Server is running..." }));

   // Webhook route triggered by GitHub push event
   app.post("/ud-api-hook", (req, res) => {
       console.log("Webhook triggered at:", new Date());
       res.status(200).send({ message: "Webhook has been initiated successfully!" });

       // Run the deployment script
       shell.exec('./scripts/ud-api-hook.sh');
       console.log("Deployed UD API");
   });

   // Start the server on port 7777
   app.listen(7777, console.log("Webhook server is started running on", new Date()));
   ```

3. **Start the webhook server**:
   ```bash
   node index.js
   ```

   The server will start on port 7777. Ensure this port is open in your firewall.

---

## Deployment Script

### `ud-api-hook.sh`

The deployment script (`scripts/ud-api-hook.sh`) performs the following tasks:

```bash
#!/bin/bash

echo "Deployment started"

# Change to the project directory
cd ~/backend_underdogs

echo "Deploying changes"
# Reset the local repository to match the remote master branch
git reset --hard origin/master
git pull origin master

echo "Restoring .env file"
# Restore the .env file from the backup
sudo cp /.env-backend ./.env

echo "Installing NPM packages"
# Install the latest npm dependencies
npm install

echo "Taking a production build"
# Uncomment this if you need to build the production version
# npm run build

echo "Applying changes..."
# Restart the PM2 process to apply changes
pm2 restart api

echo "Changes applied."
```

### What the script does:

1. **Git Operations**: Resets local repository to match remote `master` branch and pulls latest changes
2. **Environment Variables**: Restores the `.env` file from backup (`/.env-backend`)
3. **Dependencies**: Installs/updates npm packages
4. **Process Restart**: Restarts the application using PM2

---

## PM2 Process Management

PM2 is used to manage the application process (`api`).

### Setup PM2

1. **Install PM2 globally**:
   ```bash
   npm install pm2 -g
   ```

2. **Start your application with PM2**:
   ```bash
   pm2 start index.js --name api
   ```

3. **Save the PM2 process list** (to persist across reboots):
   ```bash
   pm2 save
   ```

4. **Enable PM2 startup on boot**:
   ```bash
   pm2 startup
   ```
   Follow the instructions provided by the command.

### PM2 Common Commands

- **View running processes**: `pm2 list`
- **View logs**: `pm2 logs api`
- **Restart process**: `pm2 restart api`
- **Stop process**: `pm2 stop api`
- **Delete process**: `pm2 delete api`
- **Monitor processes**: `pm2 monit`

---

## Deployment Workflow

### How It Works

1. **Developer pushes to GitHub**: Changes are pushed to the `master` branch
2. **GitHub triggers webhook**: GitHub sends a POST request to `http://<your-server-ip>:7777/ud-api-hook`
3. **Webhook server receives request**: The Node.js server receives the request and executes the deployment script
4. **Deployment script runs**:
   - Pulls latest code from GitHub
   - Restores `.env` file
   - Installs dependencies
   - Restarts the application via PM2
5. **Application updated**: The new version is now live

---

## Environment Configuration

### `.env` File Backup

The `.env` file is backed up at `/.env-backend` and restored during each deployment. This ensures sensitive configuration (like API keys) is not committed to Git but is preserved across deployments.

**Important variables in `.env`:**
- `SENDGRID_API_KEY` - SendGrid API key for email sending
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT token generation
- Other environment-specific configurations

### Updating Environment Variables

1. Edit the backup file:
   ```bash
   sudo nano /.env-backend
   ```

2. The deployment script will copy this to `.env` automatically on next deployment

---

## Troubleshooting

### View Logs

**PM2 Logs**:
```bash
pm2 logs api
```

**Webhook Server Logs**:
Check the terminal where the webhook server is running, or set up PM2 to manage it:
```bash
pm2 start index.js --name webhook
pm2 logs webhook
```

### Common Issues

1. **Port 7777 not accessible**:
   - Check firewall settings: `sudo ufw allow 7777`
   - Ensure the webhook server is running

2. **Permission denied on script execution**:
   ```bash
   chmod +x scripts/ud-api-hook.sh
   ```

3. **Git conflicts during deployment**:
   - The script uses `git reset --hard` to forcefully match remote
   - Local changes are discarded

4. **PM2 process not restarting**:
   - Check if process exists: `pm2 list`
   - Manually restart: `pm2 restart api`

---

## Security Considerations

### 1. Webhook Authentication (Recommended)

Add a secret token to verify requests are from GitHub:

```javascript
const crypto = require('crypto');

app.post("/ud-api-hook", (req, res) => {
    const secret = process.env.WEBHOOK_SECRET;
    const signature = req.headers['x-hub-signature-256'];

    // Verify signature
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

    if (signature !== digest) {
        return res.status(401).send('Unauthorized');
    }

    // Continue with deployment...
});
```

Configure the secret in GitHub webhook settings.

### 2. Firewall Configuration

Restrict port 7777 to GitHub's IP addresses:
```bash
# GitHub webhook IP ranges (check GitHub docs for current IPs)
sudo ufw allow from 192.30.252.0/22 to any port 7777
```

### 3. Script Permissions

Ensure the deployment script has minimal required permissions and uses `sudo` only when necessary.

---

## Initial Server Setup Checklist

- [ ] Install Node.js and npm
- [ ] Install PM2 globally
- [ ] Clone the repository to `~/backend_underdogs`
- [ ] Create `.env` file with required variables
- [ ] Backup `.env` to `/.env-backend`
- [ ] Make deployment script executable: `chmod +x scripts/ud-api-hook.sh`
- [ ] Start the application with PM2: `pm2 start index.js --name api`
- [ ] Save PM2 configuration: `pm2 save`
- [ ] Enable PM2 startup: `pm2 startup`
- [ ] Start webhook server (optional: manage with PM2)
- [ ] Configure GitHub webhook
- [ ] Open port 7777 in firewall
- [ ] Test deployment by pushing to master branch

---

## Monitoring and Maintenance

### Regular Maintenance

1. **Monitor disk space**: Deployment creates node_modules which can grow large
2. **Review logs periodically**: `pm2 logs api`
3. **Update PM2**: `npm install pm2@latest -g`
4. **Clear old logs**: `pm2 flush`

### Deployment Verification

After each deployment, verify:
1. Application is running: `pm2 status`
2. No errors in logs: `pm2 logs api --lines 50`
3. API is accessible: `curl http://localhost:5000/`

---

## Contact & Support

For issues or questions about the deployment process, contact the development team or refer to:
- PM2 Documentation: https://pm2.keymetrics.io/
- GitHub Webhooks Documentation: https://docs.github.com/en/webhooks
