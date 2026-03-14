import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  ApiService(this.baseUrl);
  final String baseUrl;
  String? _accessToken;

  void setToken(String? token) {
    _accessToken = token;
  }

  Map<String, String> _headers({bool auth = false}) {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (auth && _accessToken != null) {
      headers['Authorization'] = 'Bearer $_accessToken';
    }
    return headers;
  }

  Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String displayName,
    String? whatsappPhone,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/v1/auth/register'),
      headers: _headers(),
      body: jsonEncode({
        'email': email,
        'password': password,
        'displayName': displayName,
        'whatsappPhone': whatsappPhone,
      }),
    );
    return _decode(res);
  }

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    String? fcmToken,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/v1/auth/login'),
      headers: _headers(),
      body: jsonEncode({
        'email': email,
        'password': password,
        'platform': 'android',
        'fcmToken': fcmToken,
      }),
    );
    return _decode(res);
  }

  Future<Map<String, dynamic>> getStatus() async {
    final res = await http.get(Uri.parse('$baseUrl/api/v1/status'), headers: _headers(auth: true));
    return _decode(res);
  }

  Future<List<dynamic>> getPosts() async {
    final res = await http.get(Uri.parse('$baseUrl/api/v1/posts'), headers: _headers(auth: true));
    final map = _decode(res);
    return (map['items'] as List<dynamic>? ?? <dynamic>[]);
  }

  Future<List<dynamic>> getAlerts() async {
    final res = await http.get(Uri.parse('$baseUrl/api/v1/alerts'), headers: _headers(auth: true));
    final map = _decode(res);
    return (map['items'] as List<dynamic>? ?? <dynamic>[]);
  }

  Future<Map<String, dynamic>> updateNotificationPrefs({
    required bool pushEnabled,
    required bool whatsappEnabled,
    required double minStrength,
  }) async {
    final res = await http.patch(
      Uri.parse('$baseUrl/api/v1/me/notifications'),
      headers: _headers(auth: true),
      body: jsonEncode({
        'push_enabled': pushEnabled,
        'whatsapp_enabled': whatsappEnabled,
        'min_strength': minStrength,
      }),
    );
    return _decode(res);
  }

  Map<String, dynamic> _decode(http.Response res) {
    final body = res.body.isEmpty ? '{}' : res.body;
    final parsed = jsonDecode(body) as Map<String, dynamic>;
    if (res.statusCode >= 400) {
      throw Exception(parsed['message']?.toString() ?? 'Error HTTP ${res.statusCode}');
    }
    return parsed;
  }
}
