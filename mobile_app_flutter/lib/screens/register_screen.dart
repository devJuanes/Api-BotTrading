import 'package:flutter/material.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({
    super.key,
    required this.onRegister,
    required this.onGoLogin,
  });

  final Future<void> Function(String email, String password, String name, String? whatsapp) onRegister;
  final VoidCallback onGoLogin;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _waCtrl = TextEditingController();
  String? _error;
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B18),
      appBar: AppBar(backgroundColor: Colors.transparent, title: const Text('Registro')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: ListView(
          children: [
            TextField(controller: _nameCtrl, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(labelText: 'Nombre', labelStyle: TextStyle(color: Colors.white70))),
            const SizedBox(height: 12),
            TextField(controller: _emailCtrl, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(labelText: 'Email', labelStyle: TextStyle(color: Colors.white70))),
            const SizedBox(height: 12),
            TextField(controller: _passCtrl, obscureText: true, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(labelText: 'Password', labelStyle: TextStyle(color: Colors.white70))),
            const SizedBox(height: 12),
            TextField(controller: _waCtrl, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(labelText: 'WhatsApp (opcional)', labelStyle: TextStyle(color: Colors.white70))),
            const SizedBox(height: 16),
            if (_error != null) Text(_error!, style: const TextStyle(color: Colors.redAccent)),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _submit,
                child: Text(_loading ? 'Creando...' : 'Crear cuenta'),
              ),
            ),
            TextButton(onPressed: widget.onGoLogin, child: const Text('Ya tengo cuenta')),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await widget.onRegister(
        _emailCtrl.text.trim(),
        _passCtrl.text,
        _nameCtrl.text.trim(),
        _waCtrl.text.trim().isEmpty ? null : _waCtrl.text.trim(),
      );
      if (mounted) {
        widget.onGoLogin();
      }
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}
