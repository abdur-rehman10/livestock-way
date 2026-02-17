import { Clock } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function ComingSoon() {
  const location = useLocation();
  const segment = location.pathname.split("/").pop() ?? "";
  const title = segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-6">
        <Clock className="w-8 h-8 text-gray-400" />
      </div>
      <h1 className="text-2xl font-semibold mb-2">{title || "Coming Soon"}</h1>
      <p className="text-gray-500 max-w-md">
        This feature is under development and will be available soon. Stay tuned!
      </p>
    </div>
  );
}
