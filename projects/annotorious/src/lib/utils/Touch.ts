const SIM_EVENTS = {
  touchstart: 'pointerdown',
  touchmove: 'pointermove',
  touchend: 'pointerup'
} as const;

/**
 * Detect if the current device supports touch events
 */
export const isTouchDevice = (): boolean =>
  'ontouchstart' in window ||
  navigator.maxTouchPoints > 0;

/**
 * Enable touch event translation for an element
 * Converts touch events to mouse events for compatibility
 */
export const enableTouchTranslation = (element: HTMLElement): void => {
  let pressAndHoldTrigger: number | null = null;

  const simulateEvent = (type: string, touch: Touch): PointerEvent => {
    return new PointerEvent(type, {
      screenX: touch.screenX,
      screenY: touch.screenY,
      clientX: touch.clientX,
      clientY: touch.clientY,
      bubbles: true
    });
  };

  const touchHandler = (evt: TouchEvent): void => {
    const touch = evt.changedTouches[0];
    const eventType = SIM_EVENTS[evt.type as keyof typeof SIM_EVENTS];
    
    if (eventType) {
      const simulatedEvent = simulateEvent(eventType, touch);
      touch.target?.dispatchEvent(simulatedEvent);
    }
    
    evt.preventDefault();

    if (evt.type === 'touchstart' || evt.type === 'touchmove') {
      if (pressAndHoldTrigger) {
        clearTimeout(pressAndHoldTrigger);
      }

      pressAndHoldTrigger = window.setTimeout(() => {
        const simulatedEvent = simulateEvent('dblclick', touch);
        touch.target?.dispatchEvent(simulatedEvent);
      }, 800);
    }

    if (evt.type === 'touchend' && pressAndHoldTrigger) {
      clearTimeout(pressAndHoldTrigger);
      pressAndHoldTrigger = null;
    }
  };

  element.addEventListener('touchstart', touchHandler, true);
  element.addEventListener('touchmove', touchHandler, true);
  element.addEventListener('touchend', touchHandler, true);
  element.addEventListener('touchcancel', touchHandler, true);
}; 