import './Loading.css';

interface LoadingProps {
  message?: string;
}

export const Loading = ({ message = 'Loading...' }: LoadingProps) => {
  return (
    <div className="loading-container">
      <div className="loading-content">
        <div className="spinner"></div>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
}; 