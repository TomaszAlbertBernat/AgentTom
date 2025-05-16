import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import './Login.css';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuthStore();
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      setToastMessage({ message: 'Login successful', type: 'success' });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      setToastMessage({ 
        message: error || 'Please check your credentials', 
        type: 'error' 
      });
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  return (
    <div className="login-container">
      {toastMessage && (
        <div className={`toast ${toastMessage.type}`}>
          {toastMessage.message}
        </div>
      )}
      <form className="login-form" onSubmit={handleSubmit}>
        <h2 className="login-title">Login</h2>
        
        <div className="form-group">
          <label className="form-label" htmlFor="email">Email</label>
          <input
            id="email"
            className="form-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label" htmlFor="password">Password</label>
          <input
            id="password"
            className="form-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <button
          className="login-button"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}; 