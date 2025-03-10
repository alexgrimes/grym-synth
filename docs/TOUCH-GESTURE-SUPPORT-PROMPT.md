# Touch Gesture Support Implementation Prompt

## Task Description

Implement Touch Gesture Support for grym-synth as outlined in the implementation plan (docs/IMPLEMENTATION-PLAN-2025-Q2.md). This should include:

1. Adding pinch-to-zoom for waveform visualization
2. Implementing swipe gestures for navigating between generated audio samples
3. Adding touch controls for the audio player
4. Ensuring responsive design for mobile and tablet devices

## Technical Requirements

1. **Pinch-to-zoom for Waveform Visualization**
   - Implement multi-touch gesture detection for pinch actions
   - Scale the waveform visualization based on pinch distance
   - Maintain the center point of the pinch as the focal point for zooming
   - Provide visual feedback during zoom operations
   - Support zoom levels from 1x to 5x

2. **Swipe Gestures for Sample Navigation**
   - Implement horizontal swipe detection with appropriate threshold
   - Add smooth transitions between audio samples when swiping
   - Include visual indicators for swipe direction and available samples
   - Implement momentum-based scrolling for natural feel
   - Add pagination indicators to show current position in sample list

3. **Touch Controls for Audio Player**
   - Create touch-friendly playback controls with appropriate sizing
   - Implement tap-to-seek functionality on the waveform
   - Add swipe gestures for fast-forward and rewind
   - Include haptic feedback for touch interactions where supported
   - Ensure controls are accessible and follow WCAG guidelines

4. **Responsive Design**
   - Optimize layout for various screen sizes (mobile, tablet, desktop)
   - Implement responsive typography and UI element sizing
   - Use appropriate touch target sizes (minimum 44x44px)
   - Test on various device sizes and orientations
   - Ensure performance is maintained on lower-powered mobile devices

## Implementation Approach

1. **Component Structure**
   - Enhance the existing AudioWaveformVisualization component with touch gesture support
   - Create a new TouchGestureProvider context to manage and coordinate touch interactions
   - Implement a GestureDetector utility to handle complex multi-touch gestures
   - Add responsive layout components for different viewport sizes

2. **Technical Considerations**
   - Use React's useGesture hook or implement custom touch event handlers
   - Implement debouncing and throttling for performance optimization
   - Use CSS transforms for smooth animations during gestures
   - Consider using the Pointer Events API for unified mouse/touch handling
   - Implement feature detection to provide fallbacks for unsupported browsers

3. **Testing Strategy**
   - Test on actual touch devices (not just emulators)
   - Verify gesture recognition accuracy and responsiveness
   - Test edge cases like rapid gestures and multi-touch scenarios
   - Ensure accessibility is maintained with keyboard alternatives
   - Perform performance testing on lower-end mobile devices

## Success Criteria

1. Users can intuitively zoom in/out of the waveform visualization using pinch gestures
2. Swiping horizontally navigates smoothly between audio samples
3. Audio playback controls are easy to use on touch devices
4. The interface is fully responsive and usable on mobile, tablet, and desktop devices
5. All touch interactions have appropriate visual feedback
6. Performance remains smooth even during complex gesture interactions

## Next Steps

After completing the Touch Gesture Support implementation, the next step will be to implement the Pattern Recognition System, which will build upon these touch gesture capabilities to allow users to interact with and manipulate detected patterns using the touch interface.

## Continuation Pattern

After completing and testing this implementation, please create a new prompt for the next step in the implementation plan (Pattern Recognition System), and include instructions to continue this pattern of creating new task prompts until the core vision is fully implemented.

