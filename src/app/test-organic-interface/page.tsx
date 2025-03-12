'use client';

import React from 'react';
import TestOrganicInterface from '../../test/TestOrganicInterface';

/**
 * Test page for the Organic Gravitational Interface
 */
export default function TestOrganicInterfacePage() {
  return (
    <main className="test-page">
      <TestOrganicInterface />

      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          background-color: #0a0a15;
          color: #e0e0e0;
          font-family: Arial, sans-serif;
        }

        .test-page {
          min-height: 100vh;
          padding: 20px;
        }
      `}</style>
    </main>
  );
}
