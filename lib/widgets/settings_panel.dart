import 'package:flutter/material.dart';

class SettingsPanel extends StatefulWidget {
  final String? initialSystemPrompt;
  final double initialTemperature;
  final Function(String systemPrompt, double temperature) onSettingsChanged;

  const SettingsPanel({
    super.key,
    this.initialSystemPrompt,
    this.initialTemperature = 0.7,
    required this.onSettingsChanged,
  });

  @override
  State<SettingsPanel> createState() => _SettingsPanelState();
}

class _SettingsPanelState extends State<SettingsPanel> {
  late TextEditingController _promptController;
  late double _temperature;
  bool _isExpanded = false;

  @override
  void initState() {
    super.initState();
    _promptController = TextEditingController(text: widget.initialSystemPrompt ?? '');
    _temperature = widget.initialTemperature;
  }

  @override
  void dispose() {
    _promptController.dispose();
    super.dispose();
  }

  void _notifyChanges() {
    widget.onSettingsChanged(_promptController.text, _temperature);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceVariant,
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
            width: 1,
          ),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Кнопка для раскрытия/сворачивания
          InkWell(
            onTap: () {
              setState(() {
                _isExpanded = !_isExpanded;
              });
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Icon(
                    _isExpanded ? Icons.expand_less : Icons.expand_more,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Настройки модели',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  const Spacer(),
                  if (!_isExpanded)
                    Text(
                      'Температура: ${_temperature.toStringAsFixed(1)}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                ],
              ),
            ),
          ),
          // Раскрывающаяся панель
          if (_isExpanded)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Поле для системного промпта
                  Text(
                    'Системный промпт:',
                    style: Theme.of(context).textTheme.labelMedium,
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _promptController,
                    maxLines: 4,
                    decoration: InputDecoration(
                      hintText: 'Введите системный промпт...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      filled: true,
                      fillColor: Theme.of(context).colorScheme.surface,
                    ),
                    onChanged: (_) => _notifyChanges(),
                  ),
                  const SizedBox(height: 16),
                  // Регулятор температуры
                  Text(
                    'Температура: ${_temperature.toStringAsFixed(2)}',
                    style: Theme.of(context).textTheme.labelMedium,
                  ),
                  const SizedBox(height: 8),
                  Slider(
                    value: _temperature,
                    min: 0.0,
                    max: 2.0,
                    divisions: 40,
                    label: _temperature.toStringAsFixed(2),
                    onChanged: (value) {
                      setState(() {
                        _temperature = value;
                      });
                      _notifyChanges();
                    },
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '0.0 (детерминировано)',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      Text(
                        '2.0 (креативно)',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
