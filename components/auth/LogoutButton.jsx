"use client";

import { signOut } from "next-auth/react";
import { Button } from "../ui/button";
import { LogOut } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

export default function LogoutButton({ className = "", variant = "ghost", size = "icon" }) {
  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleLogout}
            className={className}
          >
            <LogOut className="h-4 w-4" />
            {size !== "icon" && <span className="ml-2">Logout</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Logout</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
