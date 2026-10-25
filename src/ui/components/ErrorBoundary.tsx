import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { analytics } from '../../services/analytics';
import { translateNow } from '../../i18n/useT';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; attempt: number };

/**
 * Catches render errors anywhere below it, reports them and offers a way back
 * instead of leaving the player on a blank screen.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, attempt: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    analytics.recordError(error, info.componentStack ?? 'render');
  }

  // A new key remounts everything below, so a screen that failed starts again from its first route
  // with fresh state instead of rendering the same broken tree.
  private restart = () => this.setState(s => ({ hasError: false, attempt: s.attempt + 1 }));

  render() {
    if (!this.state.hasError) return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;

    return (
      <View style={styles.container}>
        <Text style={styles.title} accessibilityRole="header">{translateNow('error.title')}</Text>
        <Text style={styles.body}>{translateNow('error.body')}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={this.restart}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={translateNow('error.retry')}
        >
          <Text style={styles.buttonText}>{translateNow('error.retry').toLocaleUpperCase()}</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: { color: '#FF3B30', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  body: { color: '#aaa', fontSize: 14, textAlign: 'center' },
  button: {
    marginTop: 8,
    backgroundColor: '#FFD54F',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  buttonText: { color: '#000', fontWeight: '900', letterSpacing: 1 },
});
