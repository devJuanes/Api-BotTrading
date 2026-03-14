import 'package:socket_io_client/socket_io_client.dart' as io;

class SocketService {
  io.Socket? _socket;

  void connect({
    required String baseUrl,
    required Function(dynamic data) onStatus,
    required Function(dynamic data) onNewAlert,
    required Function(dynamic data) onNewPost,
  }) {
    _socket?.dispose();
    _socket = io.io(
      baseUrl,
      io.OptionBuilder().setTransports(['websocket']).enableAutoConnect().build(),
    );

    _socket!.onConnect((_) {});
    _socket!.on('status_update', onStatus);
    _socket!.on('new_alert', onNewAlert);
    _socket!.on('new_post', onNewPost);
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }
}
