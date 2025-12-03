import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  User, 
  Mail, 
  Briefcase, 
  DollarSign, 
  MapPin, 
  Calendar,
  Bell,
  Moon,
  Shield,
  LogOut,
  Phone,
  Building2
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import MobileHeader from "@/components/layout/mobile-header";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { motion } from "framer-motion";

export default function MobileProfile() {
  const currentUser = getCurrentUser();
  const [darkMode, setDarkMode] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      localStorage.removeItem('auth-user');
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!currentUser) {
    return null;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-28">
      <MobileHeader
        title="My Profile"
        subtitle="Your account information"
        showBack={false}
        showMenu={false}
      />

      <motion.div 
        className="p-5 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Profile Header Card */}
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 border-0 shadow-xl overflow-hidden">
            <CardContent className="p-6 text-center relative">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
              </div>
              
              <div className="relative z-10">
                <div className="w-28 h-28 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/30">
                  <span className="text-white text-4xl font-bold">
                    {currentUser.firstName[0]}{currentUser.lastName[0]}
                  </span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-1">
                  {currentUser.firstName} {currentUser.lastName}
                </h2>
                <p className="text-white/80 text-lg mb-3">{currentUser.position}</p>
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-base px-4 py-1">
                  {currentUser.isActive ? "✓ Active Employee" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Personal Information */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-lg border-0 bg-card/80 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProfileInfoRow 
                icon={User} 
                label="Full Name" 
                value={`${currentUser.firstName} ${currentUser.lastName}`}
              />
              <ProfileInfoRow 
                icon={Mail} 
                label="Email" 
                value={currentUser.email}
              />
              <ProfileInfoRow 
                icon={Phone} 
                label="Phone" 
                value="+63 912 345 6789"
              />
              <ProfileInfoRow 
                icon={MapPin} 
                label="Address" 
                value="Metro Manila, Philippines"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Employment Details */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-lg border-0 bg-card/80 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Employment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProfileInfoRow 
                icon={Briefcase} 
                label="Position" 
                value={currentUser.position}
              />
              <ProfileInfoRow 
                icon={Building2} 
                label="Branch" 
                value="Main Branch"
              />
              <ProfileInfoRow 
                icon={DollarSign} 
                label="Hourly Rate" 
                value={`₱${currentUser.hourlyRate}/hr`}
              />
              <ProfileInfoRow 
                icon={Calendar} 
                label="Member Since" 
                value={currentUser.createdAt ? format(new Date(currentUser.createdAt), "MMMM d, yyyy") : "N/A"}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Account Settings */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-lg border-0 bg-card/80 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Account Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950 rounded-xl flex items-center justify-center">
                    <Moon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">Dark Mode</p>
                    <p className="text-sm text-muted-foreground">Enable dark theme</p>
                  </div>
                </div>
                <Switch 
                  checked={darkMode} 
                  onCheckedChange={setDarkMode}
                  className="scale-110"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-950 rounded-xl flex items-center justify-center">
                    <Bell className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive push alerts</p>
                  </div>
                </div>
                <Switch 
                  checked={pushNotifications} 
                  onCheckedChange={setPushNotifications}
                  className="scale-110"
                />
              </div>

              <div className="flex items-center justify-between text-base pt-2 border-t">
                <span className="text-muted-foreground">Username</span>
                <span className="font-semibold">{currentUser.username}</span>
              </div>
              <div className="flex items-center justify-between text-base">
                <span className="text-muted-foreground">Role</span>
                <span className="font-semibold capitalize">{currentUser.role}</span>
              </div>
              <div className="flex items-center justify-between text-base">
                <span className="text-muted-foreground">Employee ID</span>
                <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{currentUser.id.slice(0, 8)}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Logout Button */}
        <motion.div variants={itemVariants}>
          <Button
            variant="destructive"
            className="w-full h-16 text-lg font-semibold shadow-lg"
            onClick={handleLogout}
          >
            <LogOut className="h-6 w-6 mr-3" />
            Sign Out
          </Button>
        </motion.div>

        {/* App Version */}
        <motion.div variants={itemVariants} className="text-center pt-4 pb-8">
          <p className="text-muted-foreground text-base">The Café Employee Portal</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Version 1.0.0</p>
        </motion.div>
      </motion.div>

      <MobileBottomNav />
    </div>
  );
}

// Helper component for profile info rows
function ProfileInfoRow({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="w-11 h-11 bg-muted rounded-xl flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-semibold text-base truncate">{value}</p>
      </div>
    </div>
  );
}

