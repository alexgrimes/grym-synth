/**
 * grym-synth Dashboard Prototype
 * Date: March 9, 2025
 *
 * This file contains a prototype implementation of the grym-synth dashboard interface.
 * It demonstrates the core features and navigation structure for the application.
 *
 * This is intended as a reference implementation for the unified dashboard described
 * in the IMPLEMENTATION-PLAN-2025-Q2.md document.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';

// Mock visualization components
const AudioWaveform = () => (
  <div className="h-24 bg-gray-700 rounded-md flex items-center justify-center">
    <div className="w-full px-4">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="inline-block w-1 mx-[1px] bg-blue-400"
          style={{
            height: `${Math.sin(i / 3) * 10 + 20}px`,
            opacity: 0.6 + Math.random() * 0.4
          }}
        />
      ))}
    </div>
  </div>
);

const Spectrogram = () => (
  <div className="h-24 bg-gray-700 rounded-md overflow-hidden">
    <div className="w-full h-full" style={{
      background: 'linear-gradient(to bottom, #3b82f6, #1e40af, #1e3a8a, #312e81, #4c1d95)',
      backgroundSize: '100% 100%',
      backgroundPosition: 'center',
      opacity: 0.7
    }} />
  </div>
);

// Main Dashboard Component
export default function DashboardPrototype() {
  const [selectedTab, setSelectedTab] = useState('home');

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-blue-400">grym-synth</h1>
            <nav className="hidden md:flex space-x-6 text-sm">
              <button
                className={`px-3 py-2 rounded-md ${selectedTab === 'home' ? 'bg-blue-900/50 text-blue-300' : 'text-gray-300 hover:text-white'}`}
                onClick={() => setSelectedTab('home')}
              >
                Dashboard
              </button>
              <button
                className={`px-3 py-2 rounded-md ${selectedTab === 'generate' ? 'bg-blue-900/50 text-blue-300' : 'text-gray-300 hover:text-white'}`}
                onClick={() => setSelectedTab('generate')}
              >
                Generate
              </button>
              <button
                className={`px-3 py-2 rounded-md ${selectedTab === 'editor' ? 'bg-blue-900/50 text-blue-300' : 'text-gray-300 hover:text-white'}`}
                onClick={() => setSelectedTab('editor')}
              >
                Editor
              </button>
              <button
                className={`px-3 py-2 rounded-md ${selectedTab === 'concepts' ? 'bg-blue-900/50 text-blue-300' : 'text-gray-300 hover:text-white'}`}
                onClick={() => setSelectedTab('concepts')}
              >
                Concepts
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            <button className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {selectedTab === 'home' && (
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-6">Welcome to grym-synth</h2>
              <div className="bg-gray-800 rounded-lg p-6 mb-8">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-3">Transform Text to Audio</h3>
                    <p className="text-gray-400 mb-4">
                      grym-synth is a powerful platform that transforms textual descriptions into rich,
                      nuanced audio using advanced AI models and interactive visualization tools.
                    </p>
                    <button className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                      Get Started
                    </button>
                  </div>
                  <div className="flex-1">
                    <AudioWaveform />
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Quick Actions</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 p-5 rounded-lg hover:bg-gray-750 transition-colors cursor-pointer" onClick={() => setSelectedTab('generate')}>
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Generate Audio</h3>
                  </div>
                  <p className="text-sm text-gray-400">Create audio from text descriptions</p>
                </div>

                <div className="bg-gray-800 p-5 rounded-lg hover:bg-gray-750 transition-colors cursor-pointer" onClick={() => setSelectedTab('editor')}>
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-purple-900/50 flex items-center justify-center mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Edit Audio</h3>
                  </div>
                  <p className="text-sm text-gray-400">Manipulate and refine audio patterns</p>
                </div>

                <div className="bg-gray-800 p-5 rounded-lg hover:bg-gray-750 transition-colors cursor-pointer" onClick={() => setSelectedTab('concepts')}>
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-green-900/50 flex items-center justify-center mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Explore Concepts</h3>
                  </div>
                  <p className="text-sm text-gray-400">Experiment with musical concepts</p>
                </div>
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Recent Projects</h2>
                <button className="text-sm text-blue-400 hover:text-blue-300">View All</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <div className="p-4">
                    <h3 className="font-semibold mb-1">Forest Ambience</h3>
                    <p className="text-sm text-gray-400 mb-3">Created 2 days ago</p>
                    <Spectrogram />
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <div className="p-4">
                    <h3 className="font-semibold mb-1">Urban Soundscape</h3>
                    <p className="text-sm text-gray-400 mb-3">Created 5 days ago</p>
                    <Spectrogram />
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {selectedTab === 'generate' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">Text-to-Audio Generation</h2>

            <div className="bg-gray-800 p-6 rounded-lg">
              <label className="block text-lg mb-2">Enter a description:</label>
              <textarea
                className="w-full px-4 py-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:border-blue-500 mb-4"
                rows={4}
                placeholder="A piano playing a gentle melody with birds chirping in the background"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Diffusion Steps</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    defaultValue="50"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Guidance Scale</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    defaultValue="3.5"
                    step="0.5"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Duration</label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    defaultValue="5"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button className="px-6 py-3 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                  Generate Audio
                </button>

                <div className="text-sm text-gray-400">
                  Powered by AudioLDM
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Generated Audio</h3>
              <AudioWaveform />

              <div className="mt-4 flex justify-between">
                <div className="flex space-x-2">
                  <button className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>

                <button className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                  Open in Editor
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'editor' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">Audio Editor</h2>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Waveform</h3>
              <AudioWaveform />
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Spectrogram</h3>
              <Spectrogram />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Pattern Analysis</h3>
                <p className="text-gray-400">
                  Select a region on the spectrogram to analyze patterns
                </p>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">System Health</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">CPU Usage</span>
                      <span>24%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '24%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'concepts' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">Musical Concept Explorer</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Concept Parameters</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Harmonic Density</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue="65"
                      className="w-full mb-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Textural Complexity</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue="40"
                      className="w-full mb-1"
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <button className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                    Apply to Audio
                  </button>
                </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Preset Library</h3>

                <div className="space-y-2 mb-4">
                  <div className="p-3 bg-blue-900/30 border border-blue-800/50 rounded-md cursor-pointer hover:bg-blue-800/30 transition-colors">
                    <h4 className="font-medium">Crystalline</h4>
                    <p className="text-xs text-gray-400">High harmonic density, low grain density</p>
                  </div>

                  <div className="p-3 bg-gray-700 rounded-md cursor-pointer hover:bg-gray-650 transition-colors">
                    <h4 className="font-medium">Textural Clouds</h4>
                    <p className="text-xs text-gray-400">Medium harmonic density, high grain density</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

