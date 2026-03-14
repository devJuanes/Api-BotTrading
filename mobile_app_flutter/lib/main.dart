import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'models/trading_models.dart';
import 'screens/dashboard_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'services/api_service.dart';
import 'services/socket_service.dart';

void main() {
  runApp(const QuinaBotApp());
}

class QuinaBotApp extends StatefulWidget {
  const QuinaBotApp({super.key});

  @override
  State<QuinaBotApp> createState() => _QuinaBotAppState();
}

class _QuinaBotAppState extends State<QuinaBotApp> {
  final api = ApiService(const String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3000'));
  final socket = SocketService();

  bool loading = true;
  bool showRegister = false;
  String? token;
  Map<String, dynamic> status = {};
  List<double> prices = [];
  List<TradingAlert> alerts = [];
  List<TradingPost> posts = [];

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void dispose() {
    socket.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Quina Bot Alpha',
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF070B18),
        colorScheme: const ColorScheme.dark(primary: Color(0xFF00E5A8)),
      ),
      home: _buildHome(),
    );
  }

  Widget _buildHome() {
    if (loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (token == null) {
      if (showRegister) {
        return RegisterScreen(
          onRegister: _register,
          onGoLogin: () => setState(() => showRegister = false),
        );
      }
      return LoginScreen(
        onLogin: _login,
        onGoRegister: () => setState(() => showRegister = true),
      );
    }

    return DashboardScreen(
      status: status,
      prices: prices,
      posts: posts,
      alerts: alerts,
      onRefresh: _refreshAll,
      onUpdatePrefs: _updatePrefs,
      onLogout: _logout,
    );
  }

  Future<void> _bootstrap() async {
    final prefs = await SharedPreferences.getInstance();
    token = prefs.getString('access_token');
    if (token != null) {
      api.setToken(token);
      await _refreshAll(silent: true);
      _connectSocket();
    }
    setState(() => loading = false);
  }

  Future<void> _register(String email, String password, String name, String? whatsapp) async {
    await api.register(email: email, password: password, displayName: name, whatsappPhone: whatsapp);
  }

  Future<void> _login(String email, String password) async {
    final res = await api.login(email: email, password: password);
    token = res['accessToken']?.toString();
    if (token == null) {
      throw Exception('No se recibió token');
    }
    api.setToken(token);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access_token', token!);
    await _refreshAll(silent: true);
    _connectSocket();
    setState(() {});
  }

  Future<void> _refreshAll({bool silent = false}) async {
    try {
      final statusData = await api.getStatus();
      final postsData = await api.getPosts();
      final alertsData = await api.getAlerts();
      setState(() {
        status = statusData;
        prices = (statusData['candles'] as List<dynamic>? ?? [])
            .map((e) => (e['close'] as num?)?.toDouble() ?? 0)
            .where((v) => v > 0)
            .toList();
        posts = postsData.map((e) => TradingPost.fromJson(e as Map<String, dynamic>)).toList();
        alerts = alertsData.map((e) => TradingAlert.fromJson(e as Map<String, dynamic>)).toList();
      });
    } catch (_) {
      if (!silent) rethrow;
    }
  }

  void _connectSocket() {
    socket.connect(
      baseUrl: const String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3000'),
      onStatus: (data) {
        final map = data as Map<dynamic, dynamic>;
        setState(() {
          status = map.map((k, v) => MapEntry(k.toString(), v));
          prices = (status['candles'] as List<dynamic>? ?? [])
              .map((e) => (e['close'] as num?)?.toDouble() ?? 0)
              .where((v) => v > 0)
              .toList();
        });
      },
      onNewAlert: (data) {
        final map = (data as Map<dynamic, dynamic>).map((k, v) => MapEntry(k.toString(), v));
        setState(() {
          alerts.insert(0, TradingAlert.fromJson(map));
        });
      },
      onNewPost: (data) {
        final map = (data as Map<dynamic, dynamic>).map((k, v) => MapEntry(k.toString(), v));
        setState(() {
          posts.insert(0, TradingPost.fromJson(map));
        });
      },
    );
  }

  Future<void> _updatePrefs(bool push, bool whatsapp, double minStrength) async {
    await api.updateNotificationPrefs(
      pushEnabled: push,
      whatsappEnabled: whatsapp,
      minStrength: minStrength,
    );
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    setState(() {
      token = null;
      status = {};
      prices = [];
      posts = [];
      alerts = [];
    });
    socket.disconnect();
  }
}
