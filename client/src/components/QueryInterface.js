import React, { useState } from 'react';
import './QueryInterface.css';

const QueryInterface = ({ onSubmit, loading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !loading) {
      onSubmit(query.trim());
    }
  };

  return (
    <div className="query-interface">
      <form onSubmit={handleSubmit} className="query-form">
        <div className="input-group">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask your Bedrock Agent about multimodal content..."
            className="query-input"
            rows="3"
            disabled={loading}
          />
          <button
            type="submit"
            className={`submit-button ${loading ? 'loading' : ''}`}
            disabled={!query.trim() || loading}
          >
            {loading ? 'Processing...' : 'Query Agent'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QueryInterface;