import 'package:flutter_bloc/flutter_bloc.dart';
import '../models/message.dart';
import '../services/api_service.dart';
import 'chat_event.dart';
import 'chat_state.dart';

class ChatBloc extends Bloc<ChatEvent, ChatState> {
  final ApiService _apiService;

  ChatBloc({ApiService? apiService})
      : _apiService = apiService ?? ApiService(),
        super(const ChatInitial()) {
    on<SendMessage>(_onSendMessage);
    on<ClearChat>(_onClearChat);
  }

  Future<void> _onSendMessage(
    SendMessage event,
    Emitter<ChatState> emit,
  ) async {
    // Получаем текущие сообщения
    final currentMessages = state is ChatLoaded
        ? (state as ChatLoaded).messages
        : state is ChatLoading
            ? (state as ChatLoading).messages
            : state is ChatError
                ? (state as ChatError).messages
                : <Message>[];

    // Добавляем сообщение пользователя
    final userMessage = Message(
      text: event.message,
      isUser: true,
    );
    final updatedMessages = [...currentMessages, userMessage];

    // Переходим в состояние загрузки
    emit(ChatLoading(updatedMessages));

    try {
      // Отправляем запрос к API
      final response = await _apiService.sendMessage(updatedMessages);

      // Добавляем ответ от ИИ
      final aiMessage = Message(
        text: response,
        isUser: false,
      );
      final finalMessages = [...updatedMessages, aiMessage];

      // Переходим в состояние загружено
      emit(ChatLoaded(finalMessages));
    } catch (e) {
      // Переходим в состояние ошибки
      String errorMessage = e.toString();
      
      // Убираем префикс "Exception: " если есть
      if (errorMessage.startsWith('Exception: ')) {
        errorMessage = errorMessage.substring(11);
      }
      
      if (errorMessage.contains('Превышен дневной лимит') || 
          errorMessage.contains('Daily limit exceeded')) {
        // Ошибка лимита - оставляем сообщение как есть
        errorMessage = errorMessage;
      } else if (errorMessage.contains('Failed host lookup') || 
          errorMessage.contains('Connection refused')) {
        errorMessage = 'Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен на порту 3000.';
      } else if (errorMessage.contains('timeout')) {
        errorMessage = 'Превышено время ожидания ответа от сервера.';
      } else if (errorMessage.contains('500') || errorMessage.contains('Server configuration')) {
        errorMessage = 'Ошибка сервера. Проверьте настройку API ключа в .env файле.';
      }
      emit(ChatError(updatedMessages, errorMessage));
    }
  }

  void _onClearChat(
    ClearChat event,
    Emitter<ChatState> emit,
  ) {
    emit(const ChatInitial());
  }
}
