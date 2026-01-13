enum Emotion { green, blue, red }

class Message {
  final String text;
  final bool isUser;
  final DateTime timestamp;
  final String? topic;
  final String? body;
  final Emotion? emotion;

  Message({
    required this.text,
    required this.isUser,
    DateTime? timestamp,
    this.topic,
    this.body,
    this.emotion,
  }) : timestamp = timestamp ?? DateTime.now();

  Message copyWith({
    String? text,
    bool? isUser,
    DateTime? timestamp,
    String? topic,
    String? body,
    Emotion? emotion,
  }) {
    return Message(
      text: text ?? this.text,
      isUser: isUser ?? this.isUser,
      timestamp: timestamp ?? this.timestamp,
      topic: topic ?? this.topic,
      body: body ?? this.body,
      emotion: emotion ?? this.emotion,
    );
  }

  @override
  String toString() => 'Message(text: $text, isUser: $isUser, timestamp: $timestamp, topic: $topic, emotion: $emotion)';

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is Message &&
        other.text == text &&
        other.isUser == isUser &&
        other.timestamp == timestamp &&
        other.topic == topic &&
        other.body == body &&
        other.emotion == emotion;
  }

  @override
  int get hashCode => text.hashCode ^ isUser.hashCode ^ timestamp.hashCode ^ topic.hashCode ^ body.hashCode ^ emotion.hashCode;
}
