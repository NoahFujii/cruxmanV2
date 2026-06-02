import { Component } from 'react';

/**
 * Catches errors thrown by a failed GLB load (404, parse error, etc.) and
 * renders the `fallback` prop (a procedural R3F primitive) instead of crashing
 * the canvas. Reset by changing the `key` prop (done by ModelOrFallback).
 */
export default class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
