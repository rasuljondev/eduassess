import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from telegram-bot/.env and parent .env using absolute paths
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') }); 

const BOT_TOKEN = process.env.BOT;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_PORT = parseInt(process.env.BOT_WEBHOOK_PORT || '3001', 10);

if (!BOT_TOKEN) {
  console.error('Error: BOT token is required. Please set BOT in your .env file.');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Supabase credentials are required. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.');
  process.exit(1);
}

// Initialize Telegram Bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Welcome message
const WELCOME_MESSAGE = `👋 Welcome to EduAssess Bot!

📚 About EduAssess:
EduAssess is a professional online assessment platform that helps education centers conduct exams efficiently.

📝 How to use this bot:
1. Send your login credentials (e.g., test_ielts_ab12c)
2. We'll check your test results
3. If your score is ready, we'll send it to you
4. If not ready yet, we'll notify you once it's graded

💡 Your login is the same one you used to take the exam.

Need help? Just send your login and we'll assist you!`;

// Helper function to validate login format
function isValidLogin(login: string): boolean {
  // Login format: typically contains underscore and alphanumeric
  // Example: test_ielts_ab12c, test_sat_xyz123
  return /^[a-z0-9_]+$/i.test(login) && login.length > 3;
}

// Helper function to format score message
function formatScoreMessage(score: any, testName?: string): string {
  const scoreValue = score.overall || score.score || Object.values(score)[0];
  
  let message = `🎉 Your test results are ready!\n\n`;
  
  if (testName) {
    message += `📝 Test: ${testName}\n`;
  }
  
  message += `⭐ Score: ${scoreValue}\n\n`;
  
  // If there are detailed scores, show them
  if (score.listening || score.reading || score.writing || score.speaking) {
    message += `📊 Detailed Scores:\n`;
    if (score.listening) message += `👂 Listening: ${score.listening}\n`;
    if (score.reading) message += `📖 Reading: ${score.reading}\n`;
    if (score.writing) message += `✍️ Writing: ${score.writing}\n`;
    if (score.speaking) message += `🗣️ Speaking: ${score.speaking}\n`;
    message += `\n`;
  }
  
  message += `✅ Your results have been published.`;
  
  return message;
}

// Store Telegram connection
async function storeConnection(login: string, chatId: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('telegram_connections')
      .upsert({
        login: login.toLowerCase().trim(),
        telegram_chat_id: chatId,
        connected_at: new Date().toISOString(),
      }, {
        onConflict: 'login',
      });

    if (error) {
      console.error('Error storing connection:', error);
    } else {
      console.log(`Stored connection: ${login} -> ${chatId}`);
    }
  } catch (err) {
    console.error('Error in storeConnection:', err);
  }
}

// Get score by login
async function getScoreByLogin(login: string): Promise<{ score: any; testName?: string; isPublished: boolean } | null> {
  try {
    // Find student by login
    const { data: student, error: studentError } = await supabase
      .from('generated_students')
      .select('id')
      .eq('login', login.toLowerCase().trim())
      .maybeSingle();

    if (studentError || !student) {
      console.log(`Student not found for login: ${login}`);
      return null;
    }

    // Find submission for this student
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .select(`
        id,
        test_id,
        tests ( name )
      `)
      .eq('generated_student_id', student.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError || !submission) {
      console.log(`Submission not found for login: ${login}`);
      return null;
    }

    // Get score
    const { data: scoreData, error: scoreError } = await supabase
      .from('scores')
      .select('*')
      .eq('submission_id', submission.id)
      .maybeSingle();

    if (scoreError || !scoreData) {
      return null;
    }

    const testName = (submission as any).tests?.name;

    return {
      score: scoreData.final_score,
      testName,
      isPublished: scoreData.is_published,
    };
  } catch (err) {
    console.error('Error in getScoreByLogin:', err);
    return null;
  }
}

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, WELCOME_MESSAGE);
});

// Handle login messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text) return;

  // Ignore commands
  if (text.startsWith('/')) return;

  // Check if it looks like a login
  if (!isValidLogin(text)) {
    await bot.sendMessage(
      chatId,
      `❌ Invalid login format. Please send your login credentials (e.g., test_ielts_ab12c)`
    );
    return;
  }

  const login = text.toLowerCase().trim();

  try {
    // Store connection
    await storeConnection(login, chatId);

    // Check for score
    const scoreData = await getScoreByLogin(login);

    if (!scoreData) {
      // No submission found
      await bot.sendMessage(
        chatId,
        `🔍 We couldn't find a submission for login: ${login}\n\nPlease make sure you've entered the correct login credentials.`
      );
      return;
    }

    if (!scoreData.isPublished) {
      // Score not published yet
      await bot.sendMessage(
        chatId,
        `⏳ Checking...\n\nYour test is being graded. We'll notify you as soon as your results are ready! 📬`
      );
      return;
    }

    // Score is published, send it
    const scoreMessage = formatScoreMessage(scoreData.score, scoreData.testName);
    await bot.sendMessage(chatId, scoreMessage);
  } catch (err) {
    console.error('Error handling message:', err);
    await bot.sendMessage(
      chatId,
      `❌ An error occurred. Please try again later or contact support.`
    );
  }
});

// Express server for webhook notifications
const app = express();
app.use(express.json());

// Webhook endpoint for admin notifications
app.post('/notify', async (req, res) => {
  try {
    const { login, score, testName } = req.body;

    if (!login || !score) {
      return res.status(400).json({ error: 'Missing login or score' });
    }

    // Get telegram_chat_id from connections
    const { data: connection, error: connError } = await supabase
      .from('telegram_connections')
      .select('telegram_chat_id')
      .eq('login', login.toLowerCase().trim())
      .maybeSingle();

    if (connError || !connection) {
      console.log(`No Telegram connection found for login: ${login}`);
      return res.status(404).json({ error: 'User not connected to bot' });
    }

    // Send notification
    const scoreMessage = formatScoreMessage(score, testName);
    await bot.sendMessage(connection.telegram_chat_id, scoreMessage);

    console.log(`Sent notification to ${login} (chat: ${connection.telegram_chat_id})`);
    res.json({ success: true, message: 'Notification sent' });
  } catch (err: any) {
    console.error('Error in /notify webhook:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start webhook server
app.listen(WEBHOOK_PORT, () => {
  console.log(`🤖 Telegram bot is running!`);
  console.log(`📡 Webhook server listening on port ${WEBHOOK_PORT}`);
  console.log(`✅ Bot is ready to receive messages and notifications`);
});

// Handle errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bot...');
  bot.stopPolling();
  process.exit(0);
});

