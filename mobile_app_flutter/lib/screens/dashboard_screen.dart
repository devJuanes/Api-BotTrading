import 'package:flutter/material.dart';
import '../models/trading_models.dart';
import '../widgets/trading_chart.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({
    super.key,
    required this.status,
    required this.prices,
    required this.posts,
    required this.alerts,
    required this.onRefresh,
    required this.onUpdatePrefs,
    required this.onLogout,
  });

  final Map<String, dynamic> status;
  final List<double> prices;
  final List<TradingPost> posts;
  final List<TradingAlert> alerts;
  final Future<void> Function() onRefresh;
  final Future<void> Function(bool push, bool whatsapp, double minStrength) onUpdatePrefs;
  final VoidCallback onLogout;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _tab = 0;
  bool _push = true;
  bool _whatsapp = false;
  double _strength = 65;

  @override
  Widget build(BuildContext context) {
    final tabs = [
      _buildHome(),
      _buildPosts(),
      _buildAlerts(),
      _buildProfile(),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFF070B18),
      appBar: AppBar(
        title: const Text('Quina Bot Alpha'),
        backgroundColor: Colors.transparent,
      ),
      drawer: Drawer(
        child: ListView(
          children: [
            const DrawerHeader(
              child: Text('Trading Menu', style: TextStyle(fontSize: 20)),
            ),
            ListTile(title: const Text('Dashboard'), onTap: () => setState(() => _tab = 0)),
            ListTile(title: const Text('Posts'), onTap: () => setState(() => _tab = 1)),
            ListTile(title: const Text('Alertas'), onTap: () => setState(() => _tab = 2)),
            ListTile(title: const Text('Configuración'), onTap: () => setState(() => _tab = 3)),
            const Divider(),
            ListTile(title: const Text('Cerrar sesión'), onTap: widget.onLogout),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: widget.onRefresh,
        child: tabs[_tab],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _tab,
        onTap: (v) => setState(() => _tab = v),
        selectedItemColor: const Color(0xFF00E5A8),
        unselectedItemColor: Colors.white60,
        backgroundColor: const Color(0xFF10172A),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_filled), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.feed), label: 'Posts'),
          BottomNavigationBarItem(icon: Icon(Icons.notifications_active), label: 'Alertas'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Perfil'),
        ],
      ),
    );
  }

  Widget _buildHome() {
    final signal = widget.status['signal']?.toString() ?? 'ESPERAR';
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: const Color(0xFF10172A), borderRadius: BorderRadius.circular(12)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Señal actual', style: TextStyle(color: Colors.white70)),
              const SizedBox(height: 4),
              Text(signal, style: TextStyle(fontSize: 28, color: signal == 'COMPRA' ? Colors.greenAccent : signal == 'VENTA' ? Colors.redAccent : Colors.amber)),
              const SizedBox(height: 8),
              Text(widget.status['reason']?.toString() ?? '', style: const TextStyle(color: Colors.white70)),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 220,
          child: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: const Color(0xFF10172A), borderRadius: BorderRadius.circular(12)),
            child: TradingChart(prices: widget.prices),
          ),
        ),
      ],
    );
  }

  Widget _buildPosts() {
    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(12),
      itemCount: widget.posts.length,
      itemBuilder: (context, index) {
        final post = widget.posts[index];
        return Card(
          color: const Color(0xFF10172A),
          child: ListTile(
            title: Text(post.title, style: const TextStyle(color: Colors.white)),
            subtitle: Text(post.body, style: const TextStyle(color: Colors.white70)),
            trailing: Text(post.signalType, style: const TextStyle(color: Colors.white70)),
          ),
        );
      },
    );
  }

  Widget _buildAlerts() {
    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(12),
      itemCount: widget.alerts.length,
      itemBuilder: (context, index) {
        final alert = widget.alerts[index];
        return Card(
          color: const Color(0xFF10172A),
          child: ListTile(
            leading: Icon(
              alert.signalType == 'VENTA' ? Icons.south : Icons.north,
              color: alert.signalType == 'VENTA' ? Colors.redAccent : Colors.greenAccent,
            ),
            title: Text('${alert.signalType} ${alert.symbol}', style: const TextStyle(color: Colors.white)),
            subtitle: Text(alert.reason, style: const TextStyle(color: Colors.white70)),
            trailing: Text(alert.strength.toStringAsFixed(0), style: const TextStyle(color: Colors.white70)),
          ),
        );
      },
    );
  }

  Widget _buildProfile() {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        SwitchListTile(
          value: _push,
          onChanged: (v) => setState(() => _push = v),
          title: const Text('Push activado', style: TextStyle(color: Colors.white)),
        ),
        SwitchListTile(
          value: _whatsapp,
          onChanged: (v) => setState(() => _whatsapp = v),
          title: const Text('WhatsApp activado', style: TextStyle(color: Colors.white)),
        ),
        const SizedBox(height: 8),
        Text('Fuerza mínima: ${_strength.toStringAsFixed(0)}', style: const TextStyle(color: Colors.white70)),
        Slider(
          value: _strength,
          min: 50,
          max: 95,
          divisions: 45,
          onChanged: (v) => setState(() => _strength = v),
        ),
        ElevatedButton(
          onPressed: () => widget.onUpdatePrefs(_push, _whatsapp, _strength),
          child: const Text('Guardar preferencias'),
        ),
      ],
    );
  }
}
