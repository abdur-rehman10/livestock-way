"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "react-day-picker/style.css";

import { cn } from "./utils";
import { buttonVariants } from "./button";

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
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}

export { Calendar };