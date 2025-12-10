import React, { forwardRef, useImperativeHandle } from 'react';
import { Scheduler } from '@daypilot/daypilot-lite-react';

const StableScheduler = forwardRef((props: any, ref) => {
  // Stabilizes ref behavior to prevent issues during unmount/remount cycles
  useImperativeHandle(ref, () => ({
    // If DayPilot exposes methods on the instance, we can proxy them here if needed.
    // For now, returning an empty object or the underlying ref handled by the library internally.
    control: (props as any).control // If passed down, though usually handled by the library
  })); 

  // Direct pass-through of props
  return <Scheduler {...props} />;
});

StableScheduler.displayName = 'StableScheduler';

export default StableScheduler;
