import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Система ограничений по IP
const DAILY_LIMIT = parseInt(process.env.DAILY_MESSAGE_LIMIT || '10', 10);
const ipRequestCounts = new Map(); // { ip: { date: 'YYYY-MM-DD', count: number } }

// Функция для получения IP адреса
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         'unknown';
}

// Функция для получения текущей даты в формате YYYY-MM-DD
function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

// Функция для проверки лимита (без увеличения счетчика)
function checkLimit(ip) {
  const today = getCurrentDate();
  const ipData = ipRequestCounts.get(ip);

  if (!ipData || ipData.date !== today) {
    // Новый день или новый IP
    return { allowed: true, count: 0, remaining: DAILY_LIMIT };
  }

  if (ipData.count >= DAILY_LIMIT) {
    return { allowed: false, count: ipData.count, remaining: 0 };
  }

  return { allowed: true, count: ipData.count, remaining: DAILY_LIMIT - ipData.count };
}

// Функция для увеличения счетчика запросов
function incrementLimit(ip) {
  const today = getCurrentDate();
  const ipData = ipRequestCounts.get(ip);

  if (!ipData || ipData.date !== today) {
    // Новый день или новый IP - создаем новую запись
    ipRequestCounts.set(ip, { date: today, count: 1 });
    return { count: 1, remaining: DAILY_LIMIT - 1 };
  }

  // Увеличиваем счетчик
  ipData.count++;
  ipRequestCounts.set(ip, ipData);
  return { count: ipData.count, remaining: DAILY_LIMIT - ipData.count };
}

// Очистка старых записей (запускается каждый час)
setInterval(() => {
  const today = getCurrentDate();
  for (const [ip, data] of ipRequestCounts.entries()) {
    if (data.date !== today) {
      ipRequestCounts.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Каждый час

// Middleware
app.use(cors({
  origin: '*', // В production укажите конкретный домен
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Middleware для логирования запросов
app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Chat endpoint - proxies to DeepSeek API
app.post('/api/chat', async (req, res) => {
  try {
    console.log('📨 Received chat request');
    const { messages, systemPrompt, temperature } = req.body;
    console.log(`📝 Messages count: ${messages?.length || 0}`);
    if (systemPrompt) {
      console.log(`📋 System prompt: ${systemPrompt.substring(0, 100)}...`);
    }
    if (temperature !== undefined) {
      console.log(`🌡️ Temperature: ${temperature}`);
    }
    
    // Логируем содержимое сообщений
    if (messages && Array.isArray(messages)) {
      console.log('💬 Messages content:');
      messages.forEach((msg, index) => {
        console.log(`  [${index + 1}] ${msg.role}: ${msg.content?.substring(0, 200)}${msg.content?.length > 200 ? '...' : ''}`);
      });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: 'Invalid request. Messages array is required.' 
      });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('❌ DEEPSEEK_API_KEY is not set in environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error' 
      });
    }
    
    console.log('🤖 Sending request to DeepSeek API...');

    // Prepare request for DeepSeek API
    // Используем deepseek-chat (дешевая chat модель)
    // НЕ используем deepseek-reasoner или deepseek-chat-reasoner (reasoning модели дороже)
    const deepseekUrl = 'https://api.deepseek.com/v1/chat/completions';
    
    // Формируем массив сообщений с системным промптом, если он указан
    const messagesForApi = [];
    if (systemPrompt && systemPrompt.trim().length > 0) {
      messagesForApi.push({
        role: 'system',
        content: systemPrompt.trim(),
      });
    }
    messagesForApi.push(...messages);
    
    const requestBody = {
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat', // Chat модель (дешевле reasoning)
      messages: messagesForApi,
      stream: false,
    };
    
    // Добавляем temperature, если указана
    if (temperature !== undefined && temperature !== null) {
      requestBody.temperature = temperature;
    }
    
    // Логируем полный запрос к DeepSeek API
    console.log('🚀 Full request to DeepSeek API:');
    console.log('URL:', deepseekUrl);
    console.log('Model:', requestBody.model);
    console.log('Messages count:', messagesForApi.length, `(${systemPrompt ? 'with system prompt' : 'no system prompt'})`);
    if (requestBody.temperature !== undefined) {
      console.log('Temperature:', requestBody.temperature);
    }
    console.log('📋 Full request body:');
    console.log(JSON.stringify(requestBody, null, 2));
    console.log('─'.repeat(80));
    
    // Увеличиваем timeout для запроса к DeepSeek API до 120 секунд
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 секунд
    
    const response = await fetch(deepseekUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ DeepSeek API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Failed to get response from AI service',
        details: errorText 
      });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'No response';
    console.log(`✅ Received response from DeepSeek (${aiResponse.length} chars)`);
    console.log(`📄 Full response:`);
    console.log(aiResponse);
    console.log('─'.repeat(80));
    
    // Возвращаем ответ без информации о лимите (лимит отключен)
    res.json(data);
  } catch (error) {
    console.error('❌ Error processing chat request:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
