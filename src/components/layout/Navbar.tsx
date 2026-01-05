'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  Sun,
  Moon,
  GitCompare,
  RefreshCw,
  Settings,
  Maximize2,
  ChevronDown,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface NavbarProps {
  onResetGraph?: () => void;
  onFitView?: () => void;
  onExport?: () => void;
}

export function Navbar({ onResetGraph, onFitView, onExport }: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <nav className="glass-navbar fixed top-0 left-0 right-0 z-50 h-16">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GitCompare className="h-8 w-8 text-primary" />
            <span className="text-xl font-semibold">Drift Visualizer</span>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <TooltipProvider>
      <nav className="glass-navbar fixed top-0 left-0 right-0 z-50 h-16">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
              <GitCompare className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-semibold">Drift Visualizer</span>
              <span className="hidden sm:inline text-sm text-muted-foreground ml-2">
                Infrastructure State Monitor
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative" ref={settingsRef}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Settings className="h-5 w-5" />
                    <ChevronDown className={cn('h-3 w-3 ml-1 transition-transform', showSettings && 'rotate-180')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>

              {showSettings && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-popover border rounded-lg shadow-lg p-1 z-50">
                  <div className="px-3 py-2 text-xs text-muted-foreground border-b mb-1">
                    Auto-refresh: 30 seconds
                  </div>
                  <button
                    onClick={() => {
                      setTheme(theme === 'dark' ? 'light' : 'dark');
                      setShowSettings(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="h-4 w-4" />
                        Switch to Light Mode
                      </>
                    ) : (
                      <>
                        <Moon className="h-4 w-4" />
                        Switch to Dark Mode
                      </>
                    )}
                  </button>
                  <div className="h-px bg-border my-1" />
                  <button
                    onClick={() => {
                      onResetGraph?.();
                      setShowSettings(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset Graph Layout
                  </button>
                  <button
                    onClick={() => {
                      onFitView?.();
                      setShowSettings(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground"
                  >
                    <Maximize2 className="h-4 w-4" />
                    Fit All Nodes
                  </button>
                  <div className="h-px bg-border my-1" />
                  <button
                    onClick={() => {
                      onExport?.();
                      setShowSettings(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground"
                  >
                    <Download className="h-4 w-4" />
                    Export Report
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </TooltipProvider>
  );
}
