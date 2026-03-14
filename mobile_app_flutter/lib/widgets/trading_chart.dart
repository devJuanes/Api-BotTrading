import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

class TradingChart extends StatelessWidget {
  const TradingChart({super.key, required this.prices});
  final List<double> prices;

  @override
  Widget build(BuildContext context) {
    if (prices.isEmpty) {
      return const Center(child: Text('Sin datos de gráfico'));
    }

    final spots = <FlSpot>[];
    for (var i = 0; i < prices.length; i++) {
      spots.add(FlSpot(i.toDouble(), prices[i]));
    }

    return LineChart(
      LineChartData(
        minY: prices.reduce((a, b) => a < b ? a : b) * 0.995,
        maxY: prices.reduce((a, b) => a > b ? a : b) * 1.005,
        gridData: const FlGridData(show: true),
        borderData: FlBorderData(show: false),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            color: const Color(0xFF00E5A8),
            barWidth: 3,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true,
              color: const Color(0x2200E5A8),
            ),
          ),
        ],
        titlesData: const FlTitlesData(show: false),
      ),
    );
  }
}
