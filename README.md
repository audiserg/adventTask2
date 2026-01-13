# Диалог с Жванецким - Flutter Web приложение с DeepSeek API

Веб-приложение для диалога с ИИ в стиле Михаила Жванецкого, построенное на Flutter для web с использованием DeepSeek API. Приложение использует Node.js бэкенд для безопасного хранения API ключа.

## Архитектура

- **Flutter Web** - клиентское приложение с UI чата
- **Node.js + Express** - бэкенд-прокси для безопасного хранения API ключа
- **DeepSeek API** - сервис ИИ для генерации ответов
- **Nginx** - веб-сервер для раздачи статики и проксирования API запросов

## Локальная разработка

### Требования

- Flutter SDK (последняя версия)
- Node.js 18+ (для встроенного fetch)
- npm или yarn

### Запуск бэкенда

1. Перейдите в директорию бэкенда:
```bash
cd backend
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

4. Добавьте ваш DeepSeek API ключ в `.env`:
```
DEEPSEEK_API_KEY=your_deepseek_api_key_here
PORT=3000
# Опционально: DEEPSEEK_MODEL=deepseek-chat (по умолчанию используется chat модель, дешевле reasoning)
# Опционально: DAILY_MESSAGE_LIMIT=10 (лимит сообщений в день с одного IP, по умолчанию 10)
```

5. Запустите сервер:
```bash
npm start
```

Сервер будет доступен на `http://localhost:3000`

### Запуск Flutter приложения

1. Установите зависимости:
```bash
flutter pub get
```

2. Обновите URL бэкенда в `lib/services/api_service.dart`:
```dart
static const String baseUrl = 'http://localhost:3000';
```

3. Запустите приложение:
```bash
flutter run -d chrome
```

## Развертывание на VPS

### Подготовка сервера

1. Установите необходимые пакеты:
```bash
sudo apt update
sudo apt install -y nginx nodejs npm git
```

2. Установите PM2 для управления Node.js процессом:
```bash
sudo npm install -g pm2
```

3. Установите Flutter на сервере (или собирайте локально и загружайте build)

### Развертывание бэкенда

1. Скопируйте проект на сервер:
```bash
scp -r backend/ user@your-server:/var/www/ai-chat/
```

2. На сервере перейдите в директорию:
```bash
cd /var/www/ai-chat/backend
```

3. Установите зависимости:
```bash
npm install --production
```

4. Создайте `.env` файл:
```bash
nano .env
```

Добавьте:
```
DEEPSEEK_API_KEY=your_deepseek_api_key_here
PORT=3000
NODE_ENV=production
```

5. Запустите бэкенд через PM2:
```bash
cd /var/www/ai-chat
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup  # для автозапуска при перезагрузке
```

### Сборка Flutter приложения

1. Локально соберите production версию:
```bash
flutter build web --release
```

2. Обновите URL бэкенда в `lib/services/api_service.dart` на ваш домен/IP:
```dart
static const String baseUrl = 'https://your-domain.com';
```

3. Пересоберите:
```bash
flutter build web --release
```

4. Загрузите build на сервер:
```bash
scp -r build/web/* user@your-server:/var/www/ai-chat/build/web/
```

### Настройка Nginx

1. Скопируйте конфигурацию:
```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/ai-chat
```

2. Отредактируйте конфигурацию:
```bash
sudo nano /etc/nginx/sites-available/ai-chat
```

Измените:
- `server_name` на ваш домен или IP
- `root` путь, если отличается

3. Создайте символическую ссылку:
```bash
sudo ln -s /etc/nginx/sites-available/ai-chat /etc/nginx/sites-enabled/
```

4. Проверьте конфигурацию:
```bash
sudo nginx -t
```

5. Перезапустите Nginx:
```bash
sudo systemctl restart nginx
```

### Проверка работы

1. Проверьте бэкенд:
```bash
curl http://localhost:3000/health
```

2. Откройте в браузере ваш домен или IP адрес

3. Проверьте логи:
```bash
# Логи Nginx
sudo tail -f /var/log/nginx/ai-chat-error.log

# Логи PM2
pm2 logs deepseek-proxy
```

## Структура проекта

```
adventTask1/
├── lib/                    # Flutter приложение
│   ├── main.dart          # Точка входа
│   ├── models/            # Модели данных
│   ├── services/          # API сервисы
│   ├── bloc/              # BloC для state management
│   └── widgets/           # UI виджеты
├── backend/               # Node.js бэкенд
│   ├── server.js         # Express сервер
│   ├── package.json      # Зависимости
│   └── .env.example      # Пример переменных окружения
├── deploy/                # Конфигурации развертывания
│   ├── nginx.conf        # Конфигурация Nginx
│   └── ecosystem.config.js # PM2 конфигурация
└── web/                   # Flutter web файлы
```

## Технологии

- **Flutter** - UI фреймворк
- **flutter_bloc** - State management
- **http** - HTTP клиент
- **Node.js + Express** - Бэкенд
- **DeepSeek API** - ИИ сервис (используется модель `deepseek-chat` - дешевая chat модель, не reasoning)
- **Nginx** - Веб-сервер

## Безопасность

- API ключ хранится только на сервере в `.env` файле
- Ключ никогда не попадает в клиентский код
- Бэкенд проксирует запросы к DeepSeek API
- **Ограничение по IP**: максимум 10 сообщений в день с одного IP адреса (настраивается через `DAILY_MESSAGE_LIMIT` в `.env`)
- При превышении лимита возвращается ошибка 429 с понятным сообщением
- Рекомендуется использовать HTTPS в production (Let's Encrypt)

## Получение DeepSeek API ключа

1. Зарегистрируйтесь на https://platform.deepseek.com/
2. Перейдите в раздел API Keys
3. Создайте новый ключ
4. Скопируйте ключ в `.env` файл на сервере

## Troubleshooting

### Бэкенд не запускается
- Проверьте, что Node.js версии 18+
- Убедитесь, что `.env` файл существует и содержит `DEEPSEEK_API_KEY`
- Проверьте логи: `pm2 logs deepseek-proxy`

### Nginx выдает 502 ошибку
- Проверьте, что бэкенд запущен: `pm2 list`
- Проверьте порт в конфигурации Nginx
- Проверьте логи Nginx: `sudo tail -f /var/log/nginx/ai-chat-error.log`

### Flutter приложение не может подключиться к API
- Проверьте URL в `lib/services/api_service.dart`
- Убедитесь, что бэкенд доступен на указанном порту
- Проверьте CORS настройки в бэкенде

## Лицензия

ISC
