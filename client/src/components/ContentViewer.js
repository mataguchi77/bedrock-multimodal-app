import React from 'react';
import './ContentViewer.css';

const ContentViewer = ({ content, loading }) => {
  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Querying Bedrock Agent...</p>
        </div>
      );
    }

    if (!content) {
      return (
        <div className="empty-state">
          <div className="empty-icon">🤖</div>
          <h3>Ready to explore</h3>
          <p>Submit a query above to get multimodal content from your Bedrock Knowledge Base</p>
        </div>
      );
    }

    // Parse content for different media types
    const parseMultimodalContent = (text) => {
      // Simple parsing - you can enhance this based on your content format
      const lines = text.split('\n');
      const elements = [];

      lines.forEach((line, index) => {
        if (line.trim()) {
          // Check for image references
          if (line.includes('image:') || line.includes('img:')) {
            const imageUrl = line.split(':')[1]?.trim();
            if (imageUrl) {
              elements.push(
                <div key={index} className="content-image">
                  <img src={imageUrl} alt="Content" onError={(e) => {
                    e.target.style.display = 'none';
                  }} />
                </div>
              );
            }
          }
          // Check for video references
          else if (line.includes('video:')) {
            const videoUrl = line.split(':')[1]?.trim();
            if (videoUrl) {
              elements.push(
                <div key={index} className="content-video">
                  <video controls>
                    <source src={videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              );
            }
          }
          // Regular text content
          else {
            elements.push(
              <p key={index} className="content-text">
                {line}
              </p>
            );
          }
        }
      });

      return elements;
    };

    return (
      <div className="content-display">
        {parseMultimodalContent(content)}
      </div>
    );
  };

  return (
    <div className="content-viewer">
      <div className="content-container">
        {renderContent()}
      </div>
    </div>
  );
};

export default ContentViewer;