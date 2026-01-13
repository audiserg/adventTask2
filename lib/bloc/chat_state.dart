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
  final String? currentTopic;

  const ChatLoading(this.messages, {this.currentTopic});

  @override
  List<Object?> get props => [messages, currentTopic];
}

class ChatLoaded extends ChatState {
  final List<Message> messages;
  final String? currentTopic;

  const ChatLoaded(this.messages, {this.currentTopic});

  @override
  List<Object?> get props => [messages, currentTopic];
}

class ChatError extends ChatState {
  final List<Message> messages;
  final String error;

  const ChatError(this.messages, this.error);

  @override
  List<Object?> get props => [messages, error];
}
