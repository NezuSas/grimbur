import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { analytics } from '../../services/analytics';

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

/**
 * Catches render errors anywhere below it, reports them and offers a way back
 * instead of leaving the player on a blank screen.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    analytics.recordError(error, info.componentStack ?? 'render');
  }

  private restart = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>The cave collapsed. Your best score is safe.</Text>
        <TouchableOpacity style={styles.button} onPress={this.restart} activeOpacity={0.8}>
          <Text style={styles.buttonText}>TRY AGAIN</Text>
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
    backgroundColor: '#FFD700',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  buttonText: { color: '#000', fontWeight: '900', letterSpacing: 1 },
});
