import 'package:equatable/equatable.dart';
import '../models/message.dart';

abstract class ChatState extends Equatable {
  const ChatState();

  @override
  List<Object?> get props => [];
}

class ChatInitial extends ChatState {
  const ChatInitial();
}

class ChatLoading extends ChatState {
  final List<Message> messages;

  const ChatLoading(this.messages);

  @override
  List<Object?> get props => [messages];
}

class ChatLoaded extends ChatState {
  final List<Message> messages;

  const ChatLoaded(this.messages);

  @override
  List<Object?> get props => [messages];
}

class ChatError extends ChatState {
  final List<Message> messages;
  final String error;

  const ChatError(this.messages, this.error);

  @override
  List<Object?> get props => [messages, error];
}
