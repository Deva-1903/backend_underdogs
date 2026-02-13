# Development Guide

## Running the Server with Auto-Reload 🔄

Nodemon is configured to automatically restart the server when you make changes.

### Start Development Server

```bash
npm run dev
```

Or alternatively:
```bash
npm run server
```

### What Gets Watched?

Nodemon watches these directories for changes:
- `src/` - All source code
- `model/` - Database models
- `config/` - Configuration files
- `.env` - Environment variables

### File Types Watched

- `*.js` - JavaScript files
- `*.json` - JSON files

### Ignored Directories

These won't trigger a restart:
- `node_modules/`
- `uploads/`
- Test files (`*.test.js`, `*.spec.js`)

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start server in production mode (no auto-reload) |
| `npm run dev` | Start server with nodemon (auto-reload enabled) ✨ |
| `npm run server` | Same as `npm run dev` |

---

## Development Workflow

### 1. Initial Setup

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your actual values

# Start development server
npm run dev
```

### 2. Making Changes

1. Edit any file in `src/`, `model/`, or `config/`
2. Save the file
3. Nodemon automatically restarts the server
4. Check the console for any errors

### 3. Testing Changes

```bash
# Server will restart automatically
# Check console output for:
Server listening on 5001
MongoDB Connected: ...
```

---

## Environment Variables

### Required Variables

Make sure these are set in your `.env` file:

```env
PORT=5001
NODE_ENV=development
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain
SENDER_EMAIL=your_sender_email
```

### Changing Environment Variables

When you change `.env` file:
1. Nodemon will detect the change
2. Server will restart automatically
3. New values will be loaded

---

## Troubleshooting

### Server Won't Start

**Problem:** Port already in use
```
Error: listen EADDRINUSE: address already in use :::5001
```

**Solution:**
```bash
# Find process using port 5001
lsof -i :5001

# Kill the process
kill -9 <PID>
```

### Nodemon Not Restarting

**Problem:** Changes not triggering restart

**Solutions:**

1. **Check if file is being watched:**
   - Only files in `src/`, `model/`, `config/` are watched
   - Only `.js` and `.json` files trigger restarts

2. **Restart nodemon manually:**
   - Type `rs` in the terminal and press Enter
   - Or press `Ctrl+C` and run `npm run dev` again

3. **Clear nodemon cache:**
   ```bash
   rm -rf node_modules/.cache
   npm run dev
   ```

### Too Many Restarts

**Problem:** Server keeps restarting

**Solution:**
- Check if you have a file that's being modified repeatedly
- Check for infinite loops that modify watched files
- Increase delay in `nodemon.json`:
  ```json
  "delay": "2000"
  ```

---

## Hot Tips 🔥

### Manual Restart

Type `rs` in the terminal where nodemon is running to manually restart:
```
rs
```

### View Nodemon Config

```bash
cat nodemon.json
```

### Disable Auto-Restart Temporarily

Use production mode:
```bash
npm start
```

### Watch Additional Directories

Edit `nodemon.json` and add to the `watch` array:
```json
{
  "watch": [
    "src",
    "model",
    "config",
    ".env",
    "your-new-directory"
  ]
}
```

---

## Git Safety ✅

The following files are **protected** by `.gitignore` and won't be committed:

- ✅ `.env` - Environment variables
- ✅ `node_modules/` - Dependencies
- ✅ `uploads/` - User uploads
- ✅ `*.log` - Log files
- ✅ `*.backup` - Backup files
- ✅ `.DS_Store` - Mac system files
- ✅ IDE config files (`.vscode/`, `.idea/`)

### Before Committing

Always check what will be committed:
```bash
git status
git diff
```

### If You Accidentally Add .env

```bash
# Remove from staging
git reset HEAD .env

# If already committed
git rm --cached .env
git commit -m "Remove .env from tracking"
```

---

## Production Deployment

When deploying to production:

1. **Use production script:**
   ```bash
   npm start
   ```
   (Not `npm run dev` - nodemon is for development only)

2. **Set environment:**
   ```env
   NODE_ENV=production
   ```

3. **Use process manager:**
   ```bash
   pm2 start src/server.js --name api
   ```

---

## Debugging

### Enable Verbose Logging

Add this to `nodemon.json`:
```json
{
  "verbose": true
}
```

### Debug Mode

Start with Node.js debugger:
```bash
node --inspect src/server.js
```

Then open Chrome and go to: `chrome://inspect`

---

## Quick Reference

### Restart Commands
- `rs` - Manual restart
- `Ctrl+C` - Stop server
- `npm run dev` - Start with auto-reload
- `npm start` - Start without auto-reload

### File Locations
- Server: `src/server.js`
- Config: `nodemon.json`
- Environment: `.env`
- Routes: `src/routes/`
- Controllers: `src/controllers/`
- Models: `model/`

---

**Happy Coding! 🚀**

*Nodemon will restart automatically when you save changes!*
