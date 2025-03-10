# grym-synth Implementation Prompts Index

This document provides an index of all implementation prompts for the grym-synth project, organized in the recommended implementation order. Each prompt contains detailed technical requirements, implementation approaches, and success criteria for a specific component of the system.

## Core Implementation Sequence

1. **[Text-to-Audio Generation Interface](./IMPLEMENTATION-PLAN-2025-Q2.md)**
   - Text prompt input for audio generation
   - Parameter controls (diffusion steps, guidance scale, etc.)
   - Real-time generation status updates
   - Audio playback controls
   - Save/export functionality

2. **[Touch Gesture Support](./TOUCH-GESTURE-SUPPORT-PROMPT.md)**
   - Pinch-to-zoom for waveform visualization
   - Swipe gestures for navigating between samples
   - Touch controls for audio player
   - Responsive design for mobile and tablet devices

3. **[Pattern Recognition System](./PATTERN-RECOGNITION-SYSTEM-PROMPT.md)**
   - Algorithms for detecting patterns in audio data
   - Visualization components for identified patterns
   - Interactive manipulation of detected patterns
   - Pattern transformation and application capabilities
   - Integration with touch gesture system

4. **[MIDI Generation System](./MIDI-GENERATION-SYSTEM-PROMPT.md)**
   - Algorithms for converting audio patterns to MIDI data
   - MIDI editing and manipulation capabilities
   - MIDI export and integration with external tools
   - Real-time MIDI performance features
   - Integration with Pattern Recognition System

5. **[Collaborative Editing System](./COLLABORATIVE-EDITING-SYSTEM-PROMPT.md)**
   - Real-time synchronization for multi-user editing
   - User presence and awareness features
   - Permissions and access control
   - Communication and annotation tools
   - Integration with existing systems

6. **[Advanced Visualization System](./ADVANCED-VISUALIZATION-SYSTEM-PROMPT.md)**
   - High-performance audio visualization components
   - Interactive 3D representations of audio data
   - Pattern visualization enhancements
   - Collaborative activity visualization
   - Integration with existing systems

7. **[AI-Assisted Creation Tools](./AI-ASSISTED-CREATION-TOOLS-PROMPT.md)**
   - Intelligent pattern suggestion algorithms
   - Automated audio enhancement tools
   - Style transfer and transformation capabilities
   - AI-driven composition assistance
   - Integration with existing systems

8. **[Performance Optimization System](./PERFORMANCE-OPTIMIZATION-SYSTEM-PROMPT.md)**
   - Comprehensive performance profiling and monitoring
   - Adaptive resource management strategies
   - Rendering and computation optimizations
   - Progressive loading and processing capabilities
   - Cross-system integration of optimizations

9. **[Cross-Platform Deployment System](./CROSS-PLATFORM-DEPLOYMENT-SYSTEM-PROMPT.md)**
   - Unified codebase with platform-specific adaptations
   - Native application wrappers for desktop and mobile
   - Platform-specific optimizations and features
   - Offline capabilities and synchronization
   - Integration with platform ecosystems

10. **[Documentation and Onboarding System](./DOCUMENTATION-AND-ONBOARDING-SYSTEM-PROMPT.md)**
    - Interactive tutorials and guided tours
    - Comprehensive reference documentation
    - Contextual help and tooltips
    - Example projects and templates
    - Documentation integration across all systems

## Implementation Approach

Each component should be implemented in sequence, as later components build upon the functionality provided by earlier ones. The implementation prompts provide detailed guidance for each component, including:

- Technical requirements
- Implementation approaches
- Component structures
- Testing strategies
- Success criteria

## Continuation Pattern

After completing each component, create a new task for the next component in the sequence. This systematic approach ensures that the implementation progresses in a structured manner, with each step building on the previous one until the core vision is fully implemented.

