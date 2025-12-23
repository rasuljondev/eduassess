# EduAssess Telegram Bot

Telegram bot for EduAssess platform that handles student score queries and automatic notifications.

## Features

- 🤖 Greets users with welcome message and platform info
- 📝 Accepts student login credentials
- 🔍 Checks for published scores
- 📬 Automatically notifies students when scores are published
- 💾 Stores Telegram chat IDs linked to student logins

## Setup

### 1. Install Dependencies

```bash
cd telegram-bot
npm install
```

### 2. Environment Variables

Create a `.env` file in the `telegram-bot/` directory with the following variables:

```env
# Telegram Bot Token (from BotFather)
BOT=your_telegram_bot_token_here

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Webhook Server Configuration (optional)
BOT_WEBHOOK_PORT=3001
BOT_WEBHOOK_URL=http://localhost:3001
```

**Note:** The bot will also try to read `VITE_SUPABASE_URL` and `VITE_SUPABASE_ROLE_KEY` from the parent `.env` file if available.

### 3. Run the Bot

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

## Usage

### For Students

1. Start a chat with the bot on Telegram
2. Send `/start` to get welcome message
3. Send your login credentials (e.g., `test_ielts_ab12c`)
4. The bot will:
   - Store your Telegram chat ID
   - Check if your score is ready
   - Send score if published, or "checking" message if not ready
   - Automatically notify you when score is published

### For Admins

When you publish a score in the admin panel:
1. The system automatically calls the bot webhook
2. The bot looks up the student's Telegram chat ID
3. The bot sends a notification with the score

## Webhook Endpoint

The bot exposes a webhook endpoint for admin notifications:

**POST** `/notify`

Request body:
```json
{
  "login": "test_ielts_ab12c",
  "score": {
    "overall": 7.5,
    "listening": 8.0,
    "reading": 7.0,
    "writing": 7.5,
    "speaking": 8.0
  },
  "testName": "IELTS Practice Test"
}
```

## Database Schema

The bot uses the following tables:

- `global_users` - Stores student accounts and `telegram_id` for linking
- `exam_attempts` / `exam_requests` - Exam workflow and history
- `submissions` - Student test submissions
- `scores` - Published scores

## Error Handling

The bot handles:
- Invalid login formats
- Logins not found in database
- Scores not published yet
- Users not connected to bot
- Network errors gracefully

## Deployment

### Local Development

1. Run `npm run dev` in the `telegram-bot/` directory
2. Make sure the webhook URL in admin UI points to `http://localhost:3001`

### Production

1. Build the bot: `npm run build`
2. Set up environment variables on your server
3. Run with PM2 or similar process manager:
   ```bash
   pm2 start dist/index.js --name eduassess-bot
   ```
4. Update `VITE_BOT_WEBHOOK_URL` in your main `.env` to point to your production bot URL

## Security Notes

⚠️ **Known npm audit warnings**: You may see vulnerabilities when running `npm audit`. These are from transitive dependencies of `node-telegram-bot-api` (the deprecated `request` package) and **cannot be fixed** without changing the library itself.

**Why this is acceptable:**
- ✅ Vulnerabilities are in internal dependencies, not our code
- ✅ The bot only makes **outbound** API calls to Telegram (no untrusted input)
- ✅ The library is actively maintained and widely used
- ✅ TypeScript compilation passes without errors
- ✅ Bot functionality is not affected

**For production:**
- Run the bot in a containerized/isolated environment
- Use a reverse proxy for the webhook endpoint
- Monitor for library updates that resolve these issues
- Consider alternative Telegram bot libraries in the future if needed

## Troubleshooting

- **Bot not responding**: Check that `BOT` token is correct
- **Database errors**: Verify Supabase credentials
- **Webhook not working**: Check that `BOT_WEBHOOK_URL` matches the bot server URL
- **Notifications not sent**: Ensure students have sent their login to the bot first
- **npm audit warnings**: These are from transitive dependencies and don't affect functionality

## License

Part of the EduAssess platform.

