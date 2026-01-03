"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  fromDate = new Date(),
  disabled,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
    animate
      showOutsideDays={showOutsideDays}
      hidden={{ before: fromDate }}
      classNames={{
        day_disabled: "text-gray-300 opacity-50 text-gray cursor-not-allowed pointer-events-none",
        ...classNames,
      }}
      {...props}
    />
  );
}

export { Calendar };