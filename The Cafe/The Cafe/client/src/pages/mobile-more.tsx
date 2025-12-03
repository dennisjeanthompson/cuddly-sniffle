import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  ArrowRightLeft, 
  Bell, 
  ChevronRight,
  FileText,
  HelpCircle,
  Settings,
  MessageSquare,
  Star,
  Info,
  Shield,
  Sun,
  Moon,
  Palette
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { useLocation } from "wouter";
import MobileHeader from "@/components/layout/mobile-header";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";

// Theme management hook
function useTheme() {
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') return stored;
      return 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'light') {
      root.classList.add('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const setTheme = (newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
  };

  return { theme, toggleTheme, setTheme };
}

export default function MobileMore() {
  const currentUser = getCurrentUser();
  const [, setLocation] = useLocation();
  const { theme, toggleTheme, setTheme } = useTheme();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  const mainMenuItems = [
    {
      icon: Calendar,
      label: "Time Off Requests",
      description: "Request vacation, sick leave, or personal days",
      path: "/mobile-time-off",
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-950",
      badge: null,
    },
    {
      icon: ArrowRightLeft,
      label: "Shift Trading",
      description: "Swap or give away your shifts",
      path: "/mobile-shift-trading",
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-950",
      badge: "2",
    },
    {
      icon: Bell,
      label: "Notifications",
      description: "View all your alerts and updates",
      path: "/mobile-notifications",
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-950",
      badge: "5",
    },
  ];

  const resourcesMenuItems = [
    {
      icon: Settings,
      label: "Settings",
      description: "App preferences and account settings",
      path: "#",
      color: "text-slate-600",
      bgColor: "bg-slate-100 dark:bg-slate-800",
    },
    {
      icon: FileText,
      label: "Documents",
      description: "View company policies and forms",
      path: "#",
      color: "text-cyan-600",
      bgColor: "bg-cyan-100 dark:bg-cyan-950",
    },
    {
      icon: MessageSquare,
      label: "Feedback",
      description: "Share your thoughts with management",
      path: "#",
      color: "text-pink-600",
      bgColor: "bg-pink-100 dark:bg-pink-950",
    },
  ];

  const supportMenuItems = [
    {
      icon: HelpCircle,
      label: "Help Center",
      description: "FAQs and support articles",
      path: "#",
      color: "text-indigo-600",
      bgColor: "bg-indigo-100 dark:bg-indigo-950",
    },
    {
      icon: Info,
      label: "About",
      description: "App version and information",
      path: "#",
      color: "text-gray-600",
      bgColor: "bg-gray-100 dark:bg-gray-800",
    },
  ];

  const renderMenuItem = (item: typeof mainMenuItems[0], index: number) => {
    const Icon = item.icon;
    return (
      <motion.div key={item.path + index} variants={itemVariants}>
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-all active:scale-[0.98] border-0 shadow-sm bg-card/80 backdrop-blur"
          onClick={() => item.path !== "#" && setLocation(item.path)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl ${item.bgColor} flex items-center justify-center shrink-0`}>
                <Icon className={`h-7 w-7 ${item.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-lg">{item.label}</h4>
                  {'badge' in item && item.badge && (
                    <Badge variant="destructive" className="text-xs font-bold px-2">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-base text-muted-foreground truncate">{item.description}</p>
              </div>
              <ChevronRight className="h-6 w-6 text-muted-foreground shrink-0" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-28">
      <MobileHeader
        title="More"
        subtitle="Settings & options"
        showBack={false}
        showMenu={false}
      />

      <motion.div 
        className="p-5 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Quick Welcome */}
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-primary-foreground text-2xl font-bold">
                    {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-2xl">
                    Hi, {currentUser?.firstName}!
                  </h3>
                  <p className="text-base text-muted-foreground">{currentUser?.position}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Theme Toggle Section */}
        <motion.div variants={itemVariants}>
          <h3 className="text-lg font-bold text-muted-foreground mb-3 px-1">Appearance</h3>
          <Card className="border-0 shadow-sm bg-card/80 backdrop-blur overflow-hidden">
            <CardContent className="p-0">
              {/* Theme Toggle Row */}
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                    theme === 'dark' 
                      ? 'bg-indigo-500/20' 
                      : 'bg-amber-500/20'
                  }`}>
                    {theme === 'dark' ? (
                      <Moon className="h-6 w-6 text-indigo-500" />
                    ) : (
                      <Sun className="h-6 w-6 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Dark Mode</h4>
                    <p className="text-sm text-muted-foreground">
                      {theme === 'dark' ? 'Currently using dark theme' : 'Currently using light theme'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              
              {/* Quick Theme Buttons */}
              <div className="p-4">
                <p className="text-sm text-muted-foreground mb-3">Quick switch</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    className={`h-14 rounded-xl flex items-center justify-center gap-2 transition-all ${
                      theme === 'light' 
                        ? 'bg-primary text-primary-foreground shadow-lg' 
                        : 'hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/50'
                    }`}
                    onClick={() => setTheme('light')}
                  >
                    <Sun className="h-5 w-5" />
                    <span className="font-semibold">Light</span>
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    className={`h-14 rounded-xl flex items-center justify-center gap-2 transition-all ${
                      theme === 'dark' 
                        ? 'bg-primary text-primary-foreground shadow-lg' 
                        : 'hover:bg-indigo-500/10 hover:text-indigo-600 hover:border-indigo-500/50'
                    }`}
                    onClick={() => setTheme('dark')}
                  >
                    <Moon className="h-5 w-5" />
                    <span className="font-semibold">Dark</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Menu Section */}
        <motion.div variants={itemVariants}>
          <h3 className="text-lg font-bold text-muted-foreground mb-3 px-1">Quick Actions</h3>
          <div className="space-y-3">
            {mainMenuItems.map((item, index) => renderMenuItem(item, index))}
          </div>
        </motion.div>

        {/* Resources Section */}
        <motion.div variants={itemVariants}>
          <h3 className="text-lg font-bold text-muted-foreground mb-3 px-1">Resources</h3>
          <div className="space-y-3">
            {resourcesMenuItems.map((item, index) => renderMenuItem(item, index))}
          </div>
        </motion.div>

        {/* Support Section */}
        <motion.div variants={itemVariants}>
          <h3 className="text-lg font-bold text-muted-foreground mb-3 px-1">Support</h3>
          <div className="space-y-3">
            {supportMenuItems.map((item, index) => renderMenuItem(item, index))}
          </div>
        </motion.div>

        {/* App Info */}
        <motion.div variants={itemVariants} className="text-center pt-4 pb-8">
          <p className="text-muted-foreground text-base font-medium">The Café Management System</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Employee Portal v1.0.0</p>
          <div className="flex items-center justify-center gap-1 mt-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <Star className="h-4 w-4 text-muted-foreground/30" />
            <span className="text-sm text-muted-foreground ml-1">Rate us!</span>
          </div>
        </motion.div>
      </motion.div>

      <MobileBottomNav />
    </div>
  );
}

