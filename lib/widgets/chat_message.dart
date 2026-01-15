import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../models/message.dart';

class ChatMessageWidget extends StatelessWidget {
  final Message message;

  const ChatMessageWidget({
    super.key,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    final isAiMessage = !message.isUser;
    final hasEmotion = message.emotion != null;
    
    // Отладочный вывод
    if (isAiMessage) {
      print('=== WIDGET DEBUG ===');
      print('isAiMessage: $isAiMessage');
      print('hasEmotion: $hasEmotion');
      print('emotion value: ${message.emotion}');
      print('emotion type: ${message.emotion.runtimeType}');
      print('message.topic: ${message.topic}');
      print('message.body: ${message.body?.substring(0, message.body!.length > 50 ? 50 : message.body!.length)}...');
      print('===================');
    }
    
    return Align(
      alignment: message.isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Цветная полоска и смайлик для AI сообщений
            // Показываем всегда для AI сообщений, даже если emotion null (для отладки)
            if (isAiMessage) ...[
              Container(
                width: 4,
                decoration: BoxDecoration(
                  color: hasEmotion 
                      ? _getEmotionColor(message.emotion!)
                      : Colors.grey, // Серый цвет для отладки, если emotion null
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(18),
                    bottomLeft: Radius.circular(18),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(
                  hasEmotion 
                      ? _getEmotionEmoji(message.emotion!)
                      : '❓', // Вопросительный знак для отладки
                  style: const TextStyle(fontSize: 24),
                ),
              ),
              const SizedBox(width: 8),
            ],
            // Основной контейнер с сообщением
            Flexible(
              child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: message.isUser
                        ? Theme.of(context).colorScheme.primary
                        : Theme.of(context).colorScheme.surfaceVariant,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      MarkdownBody(
                        data: message.isUser 
                            ? message.text 
                            : (message.body ?? 'Ответ получен, но не удалось распарсить формат'),
                        styleSheet: MarkdownStyleSheet(
                          p: TextStyle(
                            color: message.isUser
                                ? Theme.of(context).colorScheme.onPrimary
                                : Theme.of(context).colorScheme.onSurfaceVariant,
                            fontSize: 16,
                          ),
                          h1: TextStyle(
                            color: message.isUser
                                ? Theme.of(context).colorScheme.onPrimary
                                : Theme.of(context).colorScheme.onSurfaceVariant,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                          h2: TextStyle(
                            color: message.isUser
                                ? Theme.of(context).colorScheme.onPrimary
                                : Theme.of(context).colorScheme.onSurfaceVariant,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                          h3: TextStyle(
                            color: message.isUser
                                ? Theme.of(context).colorScheme.onPrimary
                                : Theme.of(context).colorScheme.onSurfaceVariant,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                          listBullet: TextStyle(
                            color: message.isUser
                                ? Theme.of(context).colorScheme.onPrimary
                                : Theme.of(context).colorScheme.onSurfaceVariant,
                            fontSize: 16,
                          ),
                          code: TextStyle(
                            color: message.isUser
                                ? Theme.of(context).colorScheme.onPrimary
                                : Theme.of(context).colorScheme.onSurfaceVariant,
                            fontSize: 14,
                            fontFamily: 'monospace',
                            backgroundColor: message.isUser
                                ? Theme.of(context).colorScheme.primary.withOpacity(0.2)
                                : Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
                          ),
                          codeblockDecoration: BoxDecoration(
                            color: message.isUser
                                ? Theme.of(context).colorScheme.primary.withOpacity(0.2)
                                : Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          blockquote: TextStyle(
                            color: message.isUser
                                ? Theme.of(context).colorScheme.onPrimary.withOpacity(0.8)
                                : Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.8),
                            fontSize: 16,
                            fontStyle: FontStyle.italic,
                          ),
                          strong: TextStyle(
                            color: message.isUser
                                ? Theme.of(context).colorScheme.onPrimary
                                : Theme.of(context).colorScheme.onSurfaceVariant,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                          em: TextStyle(
                            color: message.isUser
                                ? Theme.of(context).colorScheme.onPrimary
                                : Theme.of(context).colorScheme.onSurfaceVariant,
                            fontSize: 16,
                            fontStyle: FontStyle.italic,
                          ),
                          a: TextStyle(
                            color: message.isUser
                                ? Theme.of(context).colorScheme.onPrimary
                                : Theme.of(context).colorScheme.primary,
                            fontSize: 16,
                            decoration: TextDecoration.underline,
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _formatTime(message.timestamp),
                            style: TextStyle(
                              color: message.isUser
                                  ? Theme.of(context).colorScheme.onPrimary.withOpacity(0.7)
                                  : Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.7),
                              fontSize: 11,
                            ),
                          ),
                          // Иконка info для AI сообщений
                          if (isAiMessage)
                            InkWell(
                              onTap: () => _showOriginalResponse(context),
                              child: Icon(
                                Icons.info_outline,
                                size: 16,
                                color: message.isUser
                                    ? Theme.of(context).colorScheme.onPrimary.withOpacity(0.7)
                                    : Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.7),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
      ),
    );
  }

  Color _getEmotionColor(Emotion emotion) {
    switch (emotion) {
      case Emotion.green:
        return Colors.green;
      case Emotion.blue:
        return Colors.blue;
      case Emotion.red:
        return Colors.red;
    }
  }

  String _getEmotionEmoji(Emotion emotion) {
    switch (emotion) {
      case Emotion.green:
        return '😊';
      case Emotion.blue:
        return '😐';
      case Emotion.red:
        return '😔';
    }
  }

  String _formatTime(DateTime timestamp) {
    final hour = timestamp.hour.toString().padLeft(2, '0');
    final minute = timestamp.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  void _showOriginalResponse(BuildContext context) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Исходный ответ от модели'),
          content: SingleChildScrollView(
            child: SelectableText(
              message.text,
              style: const TextStyle(fontSize: 14, fontFamily: 'monospace'),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Закрыть'),
            ),
          ],
        );
      },
    );
  }
}
