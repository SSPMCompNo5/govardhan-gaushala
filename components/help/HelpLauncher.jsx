"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function HelpLauncher() {
  const [open, setOpen] = useState(false);

  const onKeyDown = useCallback((e) => {
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onKeyDown]);

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setOpen(true)}
              className="fixed bottom-4 right-4 rounded-full shadow-lg bg-white text-foreground hover:bg-accent border-border"
              aria-label="Help"
            >
              <HelpCircle className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>Help</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {open ? (
        <div
          aria-hidden={!open}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
          />
          <Card className="relative z-10 w-[min(90vw,640px)] animate-in fade-in-0 zoom-in-95">
            <CardHeader>
              <CardTitle>Help & Support</CardTitle>
              <CardDescription>Quick answers and resources</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <section>
                <h2 className="text-sm font-medium text-muted-foreground">Common issues</h2>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
                  <li>Can’t sign in? Ensure your User ID and password are correct or contact an admin.</li>
                  <li>Unauthorized page? Your role might not have access. Ask an admin to adjust permissions.</li>
                  <li>Need more? Visit the Help page for full details.</li>
                </ul>
              </section>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
              <Button asChild onClick={() => setOpen(false)}>
                <Link href="/help">Open Help Page</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : null}
    </>
  );
}
