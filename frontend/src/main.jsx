// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep this visible in dev — helps you spot the real cause.
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
            color: '#a0402a',
            maxWidth: 720,
            margin: '40px auto',
          }}
        >
          <h2>Something went wrong.</h2>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              background: '#fdf6f4',
              padding: 12,
              borderRadius: 6,
              border: '1px solid #f2d7cd',
            }}
          >
            {String(this.state.error && this.state.error.message
              ? this.state.error.message
              : this.state.error)}
          </pre>
          <button
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
            style={{
              marginTop: 12,
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              background: '#1F3A3D',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);