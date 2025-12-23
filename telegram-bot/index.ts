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
const WELCOME_MESSAGE = `👋 Welcome to EduAssess! 🎓

To create your account or link your existing account, please send your information in this format:

Surname Name Phone

📝 Example:
Karimov Javohir +998901234567

After registration, you'll receive your login credentials to access exams on our website.
🌐 Visit: eduassess.uz/student`;

// Helper function to parse user data input
function parseUserData(text: string): { surname: string; name: string; phone: string } | null {
  const trimmed = text.trim();
  const parts = trimmed.split(/\s+/);
  
  if (parts.length < 3) {
    return null;
  }
  
  const surname = parts[0];
  const name = parts[1];
  const phone = parts.slice(2).join(' '); // In case phone has spaces
  
  return { surname, name, phone };
}

// Call register-student Edge Function
async function registerStudent(
  surname: string,
  name: string,
  phone: string,
  telegramId: number,
  telegramUsername?: string
): Promise<{ success: boolean; login?: string; password?: string; message?: string; error?: string; is_new?: boolean }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/register-student`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        surname,
        name,
        phone_number: phone,
        telegram_id: telegramId,
        telegram_username: telegramUsername,
      }),
    });
    
    const result = await response.json() as { success: boolean; login?: string; password?: string; message?: string; error?: string; is_new?: boolean };
    return result;
  } catch (error) {
    console.error('Error calling register-student:', error);
    return { success: false, error: 'Failed to register. Please try again.' };
  }
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

// Note: Old architecture used telegram_connections(login -> chat_id).
// New architecture stores telegram_id directly in global_users and uses it for notifications.

// Get user results by telegram_id
async function getUserResults(telegramId: number): Promise<Array<{ centerName: string; examType: string; status: string; score?: any; date: string }>> {
  try {
    // Find user by telegram_id
    const { data: user, error: userError } = await supabase
      .from('global_users')
      .select('id, login')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (userError || !user) {
      console.log(`User not found for telegram_id: ${telegramId}`);
      return [];
    }

    // Get user's exam attempts with results
    const { data: attempts, error: attemptsError } = await supabase
      .from('user_exam_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (attemptsError || !attempts) {
      console.log(`No exam history found for user: ${user.login}`);
      return [];
    }

    return attempts.map((attempt: any) => ({
      centerName: attempt.center_name,
      examType: attempt.exam_type,
      status: attempt.status,
      score: attempt.is_published ? attempt.final_score : null,
      date: attempt.created_at,
    }));
  } catch (err) {
    console.error('Error in getUserResults:', err);
    return [];
  }
}

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id;
  
  if (!telegramId) {
    await bot.sendMessage(chatId, '❌ Unable to identify your Telegram account. Please try again.');
    return;
  }

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('global_users')
    .select('login')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (existingUser) {
    await bot.sendMessage(
      chatId,
      `👋 Welcome back!\n\nYour login: ${existingUser.login}\n\nUse /results to view your exam scores.\n\n🌐 Visit: eduassess.uz/student`
    );
    return;
  }

  await bot.sendMessage(chatId, WELCOME_MESSAGE);
});

// Handle /results command
bot.onText(/\/results/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id;
  
  if (!telegramId) {
    await bot.sendMessage(chatId, '❌ Unable to identify your Telegram account.');
    return;
  }

  try {
    const results = await getUserResults(telegramId);

    if (results.length === 0) {
      await bot.sendMessage(
        chatId,
        `📊 No exam results found.\n\nMake sure your account is linked and you have taken exams.\n\n🌐 Visit: eduassess.uz/student`
      );
      return;
    }

    let message = `📊 Your Exam Results\n\n`;

    results.forEach((result, index) => {
      message += `${index + 1}. 🏫 ${result.centerName} - ${result.examType}\n`;
      message += `   Date: ${new Date(result.date).toLocaleDateString()}\n`;
      message += `   Status: ${result.status === 'submitted' ? 'Completed ✅' : result.status === 'in_progress' ? 'In Progress ⏳' : 'Ready 📝'}\n`;
      
      if (result.score) {
        message += `   Score: ${JSON.stringify(result.score)}\n`;
      } else if (result.status === 'submitted') {
        message += `   Score: Grading in progress ⏳\n`;
      }
      
      message += `\n`;
    });

    message += `Visit eduassess.uz/student for detailed results.`;

    await bot.sendMessage(chatId, message);
  } catch (err) {
    console.error('Error getting results:', err);
    await bot.sendMessage(
      chatId,
      `❌ An error occurred while fetching your results. Please try again later.`
    );
  }
});

// Handle user data messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  const telegramId = msg.from?.id;
  const telegramUsername = msg.from?.username;

  if (!text || !telegramId) return;

  // Ignore commands
  if (text.startsWith('/')) return;

  // Try to parse as user data (Surname Name Phone)
  const userData = parseUserData(text);

  if (!userData) {
    await bot.sendMessage(
      chatId,
      `❌ Invalid format. Please send your information like this:\n\nSurname Name Phone\n\nExample:\nKarimov Javohir +998901234567`
    );
    return;
  }

  try {
    await bot.sendMessage(chatId, '⏳ Processing your request...');

    // Call register-student Edge Function
    const result = await registerStudent(
      userData.surname,
      userData.name,
      userData.phone,
      telegramId,
      telegramUsername
    );

    if (!result.success) {
      if (result.error?.includes('already linked')) {
        await bot.sendMessage(
          chatId,
          `❌ This account is already linked to another Telegram user.\n\nIf this is your account, please contact support.`
        );
      } else {
        await bot.sendMessage(
          chatId,
          `❌ ${result.error || 'Registration failed. Please try again.'}`
        );
      }
      return;
    }

    if (result.is_new) {
      // New account created
      await bot.sendMessage(
        chatId,
        `✅ Account created successfully!\n\nYour login: ${result.login}\n\n⚠️ Keep this information safe. You'll need it to access exams on our website.\n\n🌐 Visit: eduassess.uz/student`
      );
    } else {
      // Existing account linked
      await bot.sendMessage(
        chatId,
        `✅ Account found and linked!\n\nYour login: ${result.login}\n\nYou can now view your exam results here in Telegram!\n\nUse /results to see your scores.\n\n🌐 Visit: eduassess.uz/student`
      );
    }
  } catch (err) {
    console.error('Error handling user data:', err);
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
    const { telegram_id, score, testName, student_name, login } = req.body;

    if (!telegram_id || !score) {
      return res.status(400).json({ error: 'Missing telegram_id or score' });
    }

    const chatId = Number(telegram_id);
    const scoreMessage =
      typeof score === 'string' || typeof score === 'number'
        ? formatScoreMessage({ overall: score }, testName)
        : formatScoreMessage(score, testName);

    const prefix = student_name || login ? `👤 ${student_name || login}\n\n` : '';
    await bot.sendMessage(chatId, `${prefix}${scoreMessage}`);

    console.log(`Sent notification to telegram_id=${chatId}`);
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

