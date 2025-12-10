import React, { forwardRef, useImperativeHandle } from 'react';
import * as DayPilotLite from '@daypilot/daypilot-lite-react';

// Inspect imports for debugging
console.log('DayPilot-Lite-React Exports:', DayPilotLite);

// Determine the correct component, handling default vs named exports and different version structures
const SchedulerComponent = 
  (DayPilotLite as any).DayPilotScheduler || 
  (DayPilotLite as any).Scheduler || 
  (DayPilotLite as any).default?.Scheduler ||
  (DayPilotLite as any).default; // Last resort: default export might IS the component? Unlikely but possible.

if (!SchedulerComponent) {
  console.error('DayPilot Scheduler component not found in exports!', DayPilotLite);
}

const StableScheduler = forwardRef((props: any, ref) => {
  // Stabilizes ref behavior to prevent issues during unmount/remount cycles
  useImperativeHandle(ref, () => ({
    control: (props as any).control 
  })); 

  if (!SchedulerComponent) {
    return <div style={{color: 'red'}}>Error: DayPilot Scheduler Component not found. Check console.</div>;
  }

  // Direct pass-through of props
  return <SchedulerComponent {...props} />;
});

StableScheduler.displayName = 'StableScheduler';

export default StableScheduler;
