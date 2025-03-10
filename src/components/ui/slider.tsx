import * as React from "react";
import { cn } from "../../lib/utils";

export interface SliderProps {
  value: number[];
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number[]) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, min, max, step, onValueChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange([parseFloat(event.target.value)]);
    };

    return (
      <div className={cn("relative w-full touch-none select-none", className)}>
        <input
          type="range"
          ref={ref}
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={handleChange}
          className={cn(
            "h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary",
            "range-thumb:block range-thumb:h-5 range-thumb:w-5 range-thumb:rounded-full",
            "range-thumb:border-2 range-thumb:border-primary range-thumb:bg-background",
            "range-thumb:transition-colors range-thumb:focus-visible:outline-none",
            "range-thumb:focus-visible:ring-2 range-thumb:focus-visible:ring-ring",
            "range-thumb:focus-visible:ring-offset-2 range-thumb:disabled:pointer-events-none",
            "range-thumb:disabled:opacity-50"
          )}
          {...props}
        />
      </div>
    );
  }
);

Slider.displayName = "Slider";

export { Slider };