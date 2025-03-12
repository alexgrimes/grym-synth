interface Touch {
  // Standard Touch properties
  identifier: number;
  target: EventTarget;
  clientX: number;
  clientY: number;
  screenX: number;
  screenY: number;
  pageX: number;
  pageY: number;

  // Extended Touch properties for force-enabled devices
  force?: number;
  radiusX?: number;
  radiusY?: number;
  rotationAngle?: number;
}

interface TouchEvent extends UIEvent {
  readonly touches: TouchList;
  readonly targetTouches: TouchList;
  readonly changedTouches: TouchList;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
}
