'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import {
  Sun,
  Moon,
  GitCompare,
  RefreshCw,
  Settings,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavbarProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Navbar({ onRefresh, isRefreshing }: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="relative"
                >
                  <RefreshCw
                    className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh State</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 h-2 w-2 bg-drift-missing rounded-full" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-border mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </nav>
    </TooltipProvider>
  );
}
