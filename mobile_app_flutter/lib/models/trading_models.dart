class TradingAlert {
  final String id;
  final String symbol;
  final String signalType;
  final String reason;
  final double strength;
  final double price;
  final DateTime createdAt;

  TradingAlert({
    required this.id,
    required this.symbol,
    required this.signalType,
    required this.reason,
    required this.strength,
    required this.price,
    required this.createdAt,
  });

  factory TradingAlert.fromJson(Map<String, dynamic> json) {
    return TradingAlert(
      id: json['id']?.toString() ?? '',
      symbol: json['symbol']?.toString() ?? 'BTC/USDT',
      signalType: json['signal_type']?.toString() ?? 'ESPERAR',
      reason: json['reason']?.toString() ?? '',
      strength: (json['strength'] as num?)?.toDouble() ?? 0,
      price: (json['price'] as num?)?.toDouble() ?? 0,
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

class TradingPost {
  final String id;
  final String title;
  final String body;
  final String symbol;
  final String signalType;
  final double strength;
  final DateTime createdAt;

  TradingPost({
    required this.id,
    required this.title,
    required this.body,
    required this.symbol,
    required this.signalType,
    required this.strength,
    required this.createdAt,
  });

  factory TradingPost.fromJson(Map<String, dynamic> json) {
    return TradingPost(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Señal de mercado',
      body: json['body']?.toString() ?? '',
      symbol: json['symbol']?.toString() ?? 'BTC/USDT',
      signalType: json['signal_type']?.toString() ?? 'ESPERAR',
      strength: (json['strength'] as num?)?.toDouble() ?? 0,
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}
