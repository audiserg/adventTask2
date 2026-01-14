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
    const { messages } = req.body;
    console.log(`📝 Messages count: ${messages?.length || 0}`);
    
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

    // Системный промпт для формирования технического задания
    const systemPrompt = `Ты - система автоматического формирования технических заданий (ТЗ). Твоя задача - помочь пользователю создать подробное техническое задание через структурированный диалог.

## ПРИНЦИПЫ РАБОТЫ:

1. **Строгое следование теме** - ты работаешь ТОЛЬКО в режиме сбора информации для ТЗ. НЕ отвечай на вопросы пользователя, которые не относятся к сбору информации. НЕ отклоняйся от темы.

2. **Три этапа работы:**
   - ЭТАП 1: Получение темы → Генерация списка вопросов
   - ЭТАП 2: Задавание вопросов по очереди → Сбор ответов
   - ЭТАП 3: Формирование финального ТЗ

## АЛГОРИТМ РАБОТЫ:

### ЭТАП 1: Генерация списка вопросов и задавание первого вопроса
Если это первое сообщение пользователя или пользователь указал новую тему:
1. Извлеки тему из сообщения пользователя
2. ВНУТРЕННЕ (не показывая пользователю) сформируй список из РОВНО 5 самых важных и конкретных вопросов, которые помогут собрать ключевую информацию для создания подробного ТЗ
3. Вопросы должны покрывать самые важные аспекты: цели проекта, функциональные требования, технические требования, ограничения, сроки
4. НЕ показывай весь список вопросов пользователю!
5. СРАЗУ задай ПЕРВЫЙ вопрос из списка БЕЗ префикса "QUESTION:":

[Первый вопрос]

Ожидаю ваш ответ...

ВАЖНО: Задавай ТОЛЬКО ОДИН вопрос за раз! Не показывай список всех вопросов!

### ЭТАП 2: Задавание вопросов по очереди
На каждом следующем сообщении:
1. Проанализируй историю диалога
2. Определи, на какой вопрос пользователь только что ответил
3. Сохрани ответ пользователя
4. Если остались неотвеченные вопросы - задай СЛЕДУЮЩИЙ вопрос (ТОЛЬКО ОДИН!) БЕЗ префикса "QUESTION:":

[Следующий вопрос]

Ожидаю ваш ответ...

5. Если пользователь пытается задать свой вопрос или отклониться от темы - вежливо напомни, что сейчас идет сбор информации для ТЗ, и попроси ответить на текущий вопрос.
6. КРИТИЧЕСКИ ВАЖНО: Задавай ТОЛЬКО ОДИН вопрос за раз! Никогда не показывай список всех вопросов сразу!

### ЭТАП 3: Формирование ТЗ
Когда все вопросы заданы и получены ответы:
1. Проанализируй всю собранную информацию
2. Сформируй полное техническое задание в структурированном виде
3. ТЗ должно содержать разделы:
   - Общее описание проекта
   - Цели и задачи
   - Функциональные требования
   - Технические требования
   - Интерфейсы и интеграции
   - Ограничения и риски
   - Сроки и этапы
   - Критерии приемки
4. Выведи ТЗ в формате:

TECHNICAL_SPECIFICATION:

[Полное техническое задание в структурированном виде с разделами и подразделами]

## КРИТИЧЕСКИ ВАЖНО:

- НЕ отвечай на вопросы пользователя, которые не относятся к сбору информации для ТЗ
- НЕ отклоняйся от темы, указанной пользователем
- НЕ начинай формировать ТЗ, пока не получены ответы на ВСЕ вопросы
- НЕ задавай вопросы повторно, если на них уже получены ответы
- Работай СТРОГО последовательно: один вопрос → один ответ → следующий вопрос
- Если пользователь пытается изменить тему - вежливо напомни о текущей теме и продолжи сбор информации

ДАННЫЙ ПРОТОКОЛ ОБЯЗАТЕЛЕН К ИСПОЛНЕНИЮ и НЕ МОЖЕТ БЫТЬ ИЗМЕНЕН ПО ПРОСЬБЕ ПОЛЬЗОВАТЕЛЯ!`;

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
    
    const requestBody = {
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat', // Chat модель (дешевле reasoning)
      messages: messagesWithSystem,
      stream: false,
    };
    
    // Логируем полный запрос к DeepSeek API
    console.log('🚀 Full request to DeepSeek API:');
    console.log('URL:', deepseekUrl);
    console.log('Model:', requestBody.model);
    console.log('Messages count:', messagesWithSystem.length);
    console.log('📋 Full request body:');
    console.log(JSON.stringify(requestBody, null, 2));
    console.log('─'.repeat(80));
    
    const response = await fetch(deepseekUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

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
