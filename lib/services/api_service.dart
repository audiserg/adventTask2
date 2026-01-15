import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/message.dart';

class ApiService {
  // В production замените на URL вашего сервера
  static const String baseUrl = 'http://localhost:3000';

  Future<String> sendMessage(List<Message> messages) async {
    try {
      // Преобразуем сообщения в формат для API
      final messagesJson = messages
          .map(
            (msg) => {
              'role': msg.isUser ? 'user' : 'assistant',
              'content': msg.text,
            },
          )
          .toList();

      final response = await http
          .post(
            Uri.parse('$baseUrl/api/chat'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'messages': messagesJson}),
          )
          .timeout(
            const Duration(seconds: 60),
            onTimeout: () {
              throw Exception('Request timeout');
            },
          );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;

        // Извлекаем ответ от ИИ
        if (data.containsKey('choices') &&
            (data['choices'] as List).isNotEmpty) {
          final choice = (data['choices'] as List).first;
          if (choice is Map<String, dynamic> && choice.containsKey('message')) {
            final message = choice['message'] as Map<String, dynamic>;
            return message['content'] as String? ?? 'No response';
          }
        }

        throw Exception('Invalid response format');
      } else if (response.statusCode == 429) {
        // Ошибка лимита запросов
        try {
          final errorData = jsonDecode(response.body) as Map<String, dynamic>;
          final message =
              errorData['message'] as String? ??
              'Превышен дневной лимит сообщений. Максимум 10 сообщений в день.';
          throw Exception(message);
        } catch (e) {
          if (e is Exception && e.toString().contains('Превышен')) {
            rethrow;
          }
          throw Exception(
            'Превышен дневной лимит сообщений. Максимум 10 сообщений в день.',
          );
        }
      } else {
        String errorMessage = 'Failed to get response: ${response.statusCode}';
        try {
          final errorData = jsonDecode(response.body) as Map<String, dynamic>;
          errorMessage =
              errorData['message'] as String? ??
              errorData['error'] as String? ??
              errorMessage;
        } catch (_) {
          errorMessage = '${response.statusCode}: ${response.body}';
        }
        throw Exception(errorMessage);
      }
    } catch (e) {
      if (e is Exception) {
        rethrow;
      }
      throw Exception('Network error: $e');
    }
  }
}
