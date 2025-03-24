import React from 'react';
import FeedbackVisualizationDemo from '../../components/feedback/FeedbackVisualizationDemo';

export default function FeedbackVisualizationPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Bidirectional Feedback System Visualization</h1>
      <p className="mb-6">
        This demonstration shows how the XenakisLDM audio generation system uses bidirectional feedback to
        refine parameter mappings between mathematical structures and audio generation.
      </p>
      
      <FeedbackVisualizationDemo />
    </div>
  );
}