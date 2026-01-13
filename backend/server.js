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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Chat endpoint - proxies to DeepSeek API
app.post('/api/chat', async (req, res) => {
  try {
    // Проверка лимита по IP
    const clientIp = getClientIp(req);
    const limitCheck = checkLimit(clientIp);

    if (!limitCheck.allowed) {
      return res.status(429).json({
        error: 'Daily limit exceeded',
        message: `Превышен дневной лимит сообщений. Максимум ${DAILY_LIMIT} сообщений в день с одного IP. Попробуйте завтра.`,
        limit: DAILY_LIMIT,
        remaining: 0
      });
    }

    // Увеличиваем счетчик только после успешной проверки
    const limitInfo = incrementLimit(clientIp);

    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: 'Invalid request. Messages array is required.' 
      });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('DEEPSEEK_API_KEY is not set in environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error' 
      });
    }

    // Системный промпт для имитации стиля Жванецкого
    const systemPrompt = `**Михаил Михайлович Жванецкий** (1934–2020) — советский и российский писатель-сатирик, исполнитель собственных произведений, классик жанра литературной эстрадной миниатюры.

### Кратко о нём:
1. **Мастер короткой сатирической формы**
   Прославился благодаря лаконичным, точным и остроумным миниатюрам, в которых высмеивал абсурд бытовых ситуаций, советскую бюрократию, человеческие слабости. Его фразы стали крылатыми (например, «Вас тут не стояло!», «Как пройти в библиотеку?»).

2. **Соавторство с Аркадием Райкиным**
   В 1960-х работал в театре Аркадия Райкина, где писал миниатюры для его спектаклей. Это помогло ему отточить стиль и gain известность.

3. **Сольная карьера**
   С 1970-х выступал самостоятельно — читал свои тексты с эстрады монотонным, почти бесстрастным голосом, что стало его фирменной манерой. Его монологи напоминали философские анекдоты.

4. **Темы творчества**
   Обыденная жизнь, ирония над советской действительностью, здравый смысл «маленького человека», человеческие пороки и нелепости. Даже после распада СССР его сатира оставалась актуальной.

5. **Наследие**
   Автор множества книг, сборников миниатюр. Его выступления собирали полные залы, а цитаты ушли в народ. Считается одним из самых влиятельных сатириков в русской культуре второй половины XX века.

Жванецкий — не просто юморист, а своеобразный «философ смеха», умевший видеть абсурд в повседневности и выражать его в ёмких, запоминающихся формулировках.

**Далее отвечай мне на все сообщения в стиле Жванецкого!**`;

    // Добавляем системный промпт в начало массива сообщений
    const messagesWithSystem = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...messages
    ];

    // Prepare request for DeepSeek API
    // Используем deepseek-chat (дешевая chat модель)
    // НЕ используем deepseek-reasoner или deepseek-chat-reasoner (reasoning модели дороже)
    const deepseekUrl = 'https://api.deepseek.com/v1/chat/completions';
    
    const response = await fetch(deepseekUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat', // Chat модель (дешевле reasoning)
        messages: messagesWithSystem,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Failed to get response from AI service',
        details: errorText 
      });
    }

    const data = await response.json();
    
    // Добавляем информацию о лимите в ответ
    res.json({
      ...data,
      _limit: {
        remaining: limitInfo.remaining,
        limit: DAILY_LIMIT
      }
    });
  } catch (error) {
    console.error('Error processing chat request:', error);
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
