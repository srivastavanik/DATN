import { Link, useLocation } from "wouter";
import { Home, BarChart2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 border-r bg-card">
      <div className="p-4">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
          DATN
        </h1>
      </div>
      
      <nav className="space-y-2 p-4">
        <Link href="/">
          <a className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent",
            location === "/" && "bg-accent"
          )}>
            <Home size={20} />
            <span>Trading</span>
          </a>
        </Link>
        
        <Link href="/portfolio">
          <a className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent",
            location === "/portfolio" && "bg-accent"
          )}>
            <BarChart2 size={20} />
            <span>Portfolio</span>
          </a>
        </Link>
      </nav>
    </div>
  );
}
